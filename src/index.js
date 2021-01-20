const { Parser } = require("node-sql-parser");
const parser = new Parser();
const {
  doc: {
    builders: { concat, hardline, group, indent, softline, join, line },
  },
  util,
} = require("prettier");

const languages = [
  {
    extensions: [".sql"],
    name: "sql",
    parsers: ["sql-parse"],
  },
];

const parsers = {
  "sql-parse": {
    parse: (text) => parser.astify(text),
    astFormat: "sql-ast",
  },
};

let currentDepth = 0; // it may not be the best approach

function printSQL(path, options, print) {
  const node = path.getValue();
  if (Array.isArray(node)) {
    return concat(path.map(print));
  }
  switch (node.type) {
    case "select":
      return printSelectStatement(path, options, print);
    case "column_ref":
      return printColumnRef(path, options, print);
    case "binary_expr":
      return printBinaryExpr(path, options, print);
    case "unary_expr":
      return printUnaryExpr(path, options, print);
    case "ASC":
      return printAsc(path, options, print);
    case "DESC":
      return printDesc(path, options, print);
    case "date":
      return printDate(path, options, print);
    case "expr_list":
      return printExprList(path, options, print);
    case "aggr_func":
      return printAggrFunc(path, options, print);
    case "function":
      return printFunc(path, options, print);
    case "case":
      return printCase(path, options, print);
    case "when":
      return printWhen(path, options, print);
    case "else":
      return printElse(path, options, print);
    case "string":
      return `'${node.value}'`;
    default:
      return concat([node.value.toString(), node.as ? ` AS ${node.as}` : ""]);
  }
}

const printSelectStatement = (path, options, print) => {
  currentDepth++;
  const node = path.getValue();
  let res = [];
  res.push(currentDepth === 1 ? "" : hardline);
  res.push(printWithClause(path, options, print));
  res.push(printSelectClause(path, options, print));
  res.push(printFromClause(path, options, print));
  res.push(printWhereClause(path, options, print));
  res.push(printOrderByClause(path, options, print));
  res.push(printGroupByClause(path, options, print));
  res.push(printHavingClause(path, options, print));
  res.push(printLimitClause(path, options, print));
  if (!node.union) {
    res = concat(res);
  } else {
    res = concat([
      concat(res),
      hardline,
      node.union.toUpperCase(),
      path.call(print, "_next"),
    ]);
  }
  currentDepth--;
  return currentDepth === 0 ? concat([res, hardline, ";"]) : res;
};

const printWithClause = (path, options, print) => {
  const node = path.getValue();
  if (!node.with) return "";
  const _printTempTable = (path, options, print) => {
    const node = path.getValue();
    return concat([
      hardline,
      `${node.name} AS (`,
      indent(path.call((p) => p.call(print, "ast"), "stmt")),
      hardline,
      ")",
    ]);
  };
  return concat([
    // hardline is not needed since `with` is the 1st clause
    "WITH",
    concat([
      indent(
        join(
          concat([hardline, ","]),
          path.map((p) => {
            return _printTempTable(p, options, print);
          }, "with")
        )
      ),
      hardline,
      hardline, // blank line
    ]),
  ]);
};

const printSelectClause = (path, options, print) => {
  const node = path.getValue();
  const distinct = node.distinct ? " DISTINCT" : "";
  // `*` is special pattern
  if (node.columns === "*") return `SELECT${distinct} *`;
  // other then `*`
  node.columns.map((x) => (x.expr.as = x.as));
  return concat([
    // hardline is not needed since `select` is essential clause
    `SELECT${distinct}`,
    indent(
      concat([
        hardline,
        join(
          concat([hardline, ","]),
          path.map((p) => p.call(print, "expr"), "columns")
        ),
      ])
    ),
  ]);
};

const printColumnRef = (path, options, print) => {
  const node = path.getValue();
  const table = node.table ? `${node.table}.` : "";
  const as = node.as ? ` ${node.as}` : "";
  return `${table}${node.column}${as}`;
};

const printFromClause = (path, options, print) => {
  const node = path.getValue();
  const _printTable = (path, options, print) => {
    const node = path.getValue();
    // subquery
    if (node.expr) {
      return concat([
        hardline,
        "(",
        indent(path.call((p) => p.call(print, "ast"), "expr")),
        hardline,
        ")",
        node.as ? ` AS ${node.as}` : "",
      ]);
    }
    // ordinary table
    const join = node.join ? `${node.join} ` : "";
    const db = node.db ? `${node.db}.` : "";
    const table = node.table;
    const alias = node.as ? ` AS ${node.as}` : "";
    const res = concat([hardline, join, db, table, alias]);
    if (!node.on) {
      return res;
    } else {
      return concat([
        res,
        indent(concat([hardline, "ON ", path.call(print, "on")])),
      ]);
    }
  };
  return concat([
    hardline,
    "FROM",
    indent(concat(path.map((p) => _printTable(p, options, print), "from"))),
  ]);
};

const printBinaryExpr = (path, options, print) => {
  const node = path.getValue();
  // set parameters
  node.left.inWhere = node.inWhere;
  node.right.inWhere = node.inWhere;
  node.right.inBetween = node.operator === "BETWEEN";
  if (node.operator === "IN") {
    return concat([
      path.call(print, "left"),
      `${node.operator}(`,
      path.call(print, "right"),
      ")",
    ]);
  } else {
    // AND IN OR BETWEEN...
    return concat([
      node.parentheses ? "(" : "",
      path.call(print, "left"),
      node.inWhere && node.operator === "AND" ? hardline : " ",
      node.operator,
      " ",
      path.call(print, "right"),
      node.parentheses ? ")" : "",
    ]);
  }
};

const printWhereClause = (path, options, print) => {
  const node = path.getValue();
  if (!node.where) return "";
  node.where.inWhere = true;
  return concat([
    hardline,
    "WHERE",
    indent(concat([hardline, path.call(print, "where")])),
  ]);
};

const printLimitClause = (path, options, print) => {
  const node = path.getValue();
  if (!node.limit) return "";
  return concat([
    hardline,
    "LIMIT ",
    path.call((p) => p.call(print, "value"), "limit"),
  ]);
};

const printOrderByClause = (path, options, print) => {
  const node = path.getValue();
  if (!node.orderby) return "";
  return concat([
    hardline,
    "ORDER BY ",
    join(", ", path.map(print, "orderby")),
  ]);
};

const printAsc = (path, options, print) => {
  const node = path.getValue();
  return path.call(print, "expr");
};

const printDesc = (path, options, print) => {
  return `${printAsc(path, options, print)} DESC`;
};

const printDate = (path, options, print) => {
  const node = path.getValue();
  return `DATE '${node.value}'`;
};

const printExprList = (path, options, print) => {
  const node = path.getValue();
  if (node.inBetween) {
    return join(" AND ", path.map(print, "value"));
  } else {
    return join(", ", path.map(print, "value"));
  }
};

const printGroupByClause = (path, options, print) => {
  const node = path.getValue();
  if (!node.groupby) return "";
  return concat([
    hardline,
    "GROUP BY ",
    join(", ", path.map(print, "groupby")),
  ]);
};

const printHavingClause = (path, options, print) => {
  const node = path.getValue();
  if (!node.having) return "";
  return concat([hardline, "HAVING ", path.call(print, "having")]);
};

const printAggrFunc = (path, options, print) => {
  const node = path.getValue();
  return concat([
    node.name,
    "(",
    path.call((p) => p.call(print, "expr"), "args"),
    ")",
    node.as ? ` AS ${node.as}` : "",
  ]);
};

const printFunc = (path, options, print) => {
  const node = path.getValue();
  const _printOverClause = (path, options, print) => {
    const overClause = [];
    if (node.over.partitionby) {
      overClause.push(
        concat([
          "PARTITION BY ",
          path.call(
            (p) => concat(p.map((q) => q.call(print, "expr"), "partitionby")),
            "over"
          ),
        ])
      );
    }
    if (node.over.orderby) {
      overClause.push(
        concat([
          "ORDER BY ",
          path.call(
            (p) => concat(p.map((q) => q.call(print, "expr"), "orderby")),
            "over"
          ),
        ])
      );
    }
    return concat([" OVER (", join(" ", overClause), ")"]);
  };
  return concat([
    node.name.toUpperCase(),
    "(",
    path.call(print, "args"),
    ")",
    node.over ? _printOverClause(path, options, print) : "",
    node.as ? ` AS ${node.as}` : "",
  ]);
};

const printCase = (path, options, print) => {
  const node = path.getValue();
  return concat([
    "CASE",
    node.expr ? ` ${node.expr}` : "",
    indent(
      concat([
        concat(path.map(print, "args")),
        " END",
        node.as ? ` AS ${node.as}` : "",
      ])
    ),
  ]);
};

const printWhen = (path, options, print) => {
  const node = path.getValue();
  return concat([
    hardline,
    "WHEN ",
    path.call(print, "cond"),
    " THEN ",
    path.call(print, "result"),
  ]);
};

const printElse = (path, options, print) => {
  const node = path.getValue();
  return concat([hardline, "ELSE ", path.call(print, "result")]);
};

const printUnaryExpr = (path, options, print) => {
  const node = path.getValue();
  return concat([node.operator, "(", path.call(print, "expr"), ")"]);
};

const printers = {
  "sql-ast": {
    print: printSQL,
  },
};

module.exports = {
  languages,
  parsers,
  printers,
};
