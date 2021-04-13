"use strict";

const { reservedKeywords, globalFunctions } = require("./keywords");

const {
  doc: {
    builders: {
      concat,
      hardline,
      group,
      indent,
      softline,
      join,
      line,
      literalline,
      lineSuffix,
      lineSuffixBoundary,
      markAsRoot,
      dedentToRoot,
    },
  },
} = require("prettier");

const printSQL = (path, options, print) => {
  const node = path.getValue();

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length - 2; i++) {
      if ("semicolon" in node[i].children) {
        // end of statement
        let endNode = node[i].children.semicolon.Node;
        let endLine = endNode.token.line;
        if ("following_comments" in endNode.children) {
          const len = endNode.children.following_comments.NodeVec.length;
          endNode = endNode.children.following_comments.NodeVec[len - 1];
          const endLiteral = endNode.token.literal;
          let newLines = endLiteral.match(/\n/g);
          if (newLines) {
            endLine = endNode.token.line + newLines.length;
          }
        }
        // start of statement
        let startNode = node[i + 1].children;
        while (
          ["UNION", "INTERSECT", "EXCEPT", "("].indexOf(
            startNode.self.Node.token.literal.toUpperCase()
          ) !== -1
        ) {
          if ("left" in startNode) {
            startNode = startNode.left.Node.children;
          } else if ("stmt" in startNode) {
            startNode = startNode.stmt.Node.children;
          } else {
            return JSON.stringify(node);
          }
        }
        let startLine = startNode.self.Node.token.line;
        if ("leading_comments" in startNode) {
          startLine = startNode.leading_comments.NodeVec[0].token.line;
        }
        node[i].children.emptyLines = startLine - endLine - 1;
      }
    }
    return concat(path.map(print));
  }

  switch (guess_node_type(node)) {
    case "parent":
      return path.call(print, "children");
    case "schema":
      return printSchema(path, options, print);
    case "tablesampleClause":
      return printTablesampleClause(path, options, print);
    case "tablesamplePercent":
      return printTablesamplePercent(path, options, print);
    case "procedureArgument":
      return printProcedureArgument(path, options, print);
    case "createFunctionStatement":
      return printCreateFunctionStatement(path, options, print);
    case "createTableStatement":
      return printCreateTableStatement(path, options, print);
    case "withPartitionColumnsClause":
      return printWithPartitionColumnsClause(path, options, print);
    case "createViewStatement":
      return printCreateTableStatement(path, options, print);
    case "createProcedureStatement":
      return printCreateProcedureStatement(path, options, print);
    case "createSchemaStatement":
      return printCreateSchemaStatement(path, options, print);
    case "insertStatement":
      return printInsertStatement(path, options, print);
    case "updateStatement":
      return printUpdateStatement(path, options, print);
    case "truncateStatement":
      return printTruncateStatement(path, options, print);
    case "mergeStatement":
      return printMergeStatement(path, options, print);
    case "whenClause":
      return printWhenClause(path, options, print);
    case "deleteStatement":
      return printDeleteStatement(path, options, print);
    case "language":
      return printLanguage(path, options, print);
    case "namedParameter":
      return printNamedParameter(path, options, print);
    case "selectStatement":
      return printSelectStatement(path, options, print);
    case "func":
      return printFunc(path, options, print);
    case "binaryOperator":
      return printBinaryOperator(path, options, print);
    case "asStructOrValue":
      return printAsStructOrValue(path, options, print);
    case "unaryOperator":
      return printUnaryOperator(path, options, print);
    case "keywordWithExpr":
      return printKeywordWithExpr(path, options, print);
    case "keywordWithExprs":
      return printKeywordWithExprs(path, options, print);
    case "keywordWithStmt":
      return printKeywordWithStmt(path, options, print);
    case "keywordWithStmts":
      return printKeywordWithStmts(path, options, print);
    case "keywordWithGroupedExprs":
      return printKeywordWithGroupedExprs(path, options, print);
    case "intervalLiteral":
      return printIntervalLiteral(path, options, print);
    case "limitClause":
      return printLimitClause(path, options, print);
    case "groupedExpr":
      return printGroupedExpr(path, options, print);
    case "groupedExprs":
      return printGroupedExprs(path, options, print);
    case "groupedStmt":
      return printGroupedStatement(path, options, print);
    case "withQuery":
      return printWithQuery(path, options, print);
    case "withQueries":
      return printWithQueries(path, options, print);
    case "arrayAccess":
      return printArrayAccess(path, options, print);
    case "structOrArrayType":
      return printStructOrArrayType(path, options, print);
    case "typeDeclaration":
      return printTypeDeclaration(path, options, print);
    case "identAndType":
      return printIdentAndType(path, options, print);
    case "tableName":
      return printTableName(path, options, print);
    case "joinType":
      return printJoinType(path, options, print);
    case "forSystemTimeAsOfClause":
      return printForSystemTimeAsOfClause(path, options, print);
    case "as":
      return printAs(path, options, print);
    case "castArgument":
      return printCastArgument(path, options, print);
    case "extractArgument":
      return printExtractArgument(path, options, print);
    case "betweenOperator":
      return printBetweenOperator(path, options, print);
    case "setOperator":
      return printSetOperator(path, options, print);
    case "caseExpr":
      return printCaseExpr(path, options, print);
    case "overClause":
      return printOverClause(path, options, print);
    case "windowSpecification":
      return printWindowSpecification(path, options, print);
    case "windowFrameClause":
      return printWindowFrameClause(path, options, print);
    case "windowClause":
      return printWindowClause(path, options, print);
    case "windowExprs":
      return printWindowExprs(path, options, print);
    case "frameStartOrEnd":
      return printFrameStartOrEnd(path, options, print);
    case "xxxByExprs":
      return printXXXByExprs(path, options, print);
    case "xxxByExpr":
      return printXXXByExpr(path, options, print);
    case "unnestWithOffset":
      return printUnnestWithOffset(path, options, print);
    case "withOffset":
      return printWithOffset(path, options, print);
    case "caseArm":
      return printCaseArm(path, options, print);
    case "nullOrder":
      return printNullOrder(path, options, print);
    case "ignoreOrReplaceNulls":
      return printIgnoreOrReplaceNulls(path, options, print);
    case "declareStatement":
      return printDeclareStatement(path, options, print);
    case "setStatement":
      return printSetStatement(path, options, print);
    case "executeStatement":
      return printExecuteStatement(path, options, print);
    case "beginStatement":
      return printBeginStatement(path, options, print);
    case "ifStatement":
      return printIfStatement(path, options, print);
    case "elseifClause":
      return printElseifClause(path, options, print);
    case "loopStatement":
      return printLoopStatement(path, options, print);
    case "whileStatement":
      return printWhileStatement(path, options, print);
    case "singleWordStatement":
      return printSingleWordStatement(path, options, print);
    case "raiseStatement":
      return printRaiseStatement(path, options, print);
    case "callStatement":
      return printCallStatement(path, options, print);
    case "columnDefinitions":
      return printColumnDefinitions(path, options, print);
    case "alterStatement":
      return printAlterStatement(path, options, print);
    case "addColumnCluase":
      return printAddColumnClause(path, options, print);
    case "dropColumnCluase":
      return printDropColumnClause(path, options, print);
    case "dropStatement":
      return printDropStatement(path, options, print);
    default:
      return printSelf(path, options, print);
  }
};

const printTablesampleClause = (path, options, print) => {
  const node = path.getValue();
  node.system.Node.children.self.Node.token.literal = node.system.Node.children.self.Node.token.literal.toUpperCase();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "system"),
    " ",
    path.call((p) => p.call(print, "Node"), "group"),
  ]);
};

const printTablesamplePercent = (path, options, print) => {
  const node = path.getValue();
  node.percent.Node.children.self.Node.token.literal = node.percent.Node.children.self.Node.token.literal.toUpperCase();
  return concat([
    printSelf(path, options, print),
    path.call((p) => p.call(print, "Node"), "expr"),
    " ",
    path.call((p) => p.call(print, "Node"), "percent"),
    path.call((p) => p.call(print, "Node"), "rparen"),
  ]);
};

const printDropStatement = (path, options, print) => {
  const node = path.getValue();
  let semicolon = "";
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.what.Node.children.self.Node.token.literal = node.what.Node.children.self.Node.token.literal.toUpperCase();
  let materialized = "";
  if ("materialized" in node) {
    node.materialized.Node.children.self.Node.token.literal = node.materialized.Node.children.self.Node.token.literal.toUpperCase();
    materialized = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "materialized"),
    ]);
  }
  let external = "";
  if ("external" in node) {
    node.external.Node.children.self.Node.token.literal = node.external.Node.children.self.Node.token.literal.toUpperCase();
    external = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "external"),
    ]);
  }
  let ifExists = "";
  if ("if_exists" in node) {
    ifExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_exists"),
    ]);
  }
  let cascadeOrRestrict = "";
  if ("cascade_or_restrict" in node) {
    node.cascade_or_restrict.Node.children.self.Node.token.literal = node.cascade_or_restrict.Node.children.self.Node.token.literal.toUpperCase();
    cascadeOrRestrict = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "cascade_or_restrict"),
    ]);
  }
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        materialized,
        external,
        " ",
        path.call((p) => p.call(print, "Node"), "what"),
        ifExists,
        " ",
        path.call((p) => p.call(print, "Node"), "ident"),
        cascadeOrRestrict,
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printAddColumnClause = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.column.Node.children.self.Node.token.literal = node.column.Node.children.self.Node.token.literal.toUpperCase();
  let ifNotExists = "";
  if ("if_not_exists" in node) {
    ifNotExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_not_exists"),
    ]);
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    printSelf(path, options, print, config),
    " ",
    path.call((p) => p.call(print, "Node"), "column"),
    ifNotExists,
    " ",
    path.call((p) => p.call(print, "Node"), "column_definition"),
    comma,
  ]);
};

const printDropColumnClause = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.column.Node.children.self.Node.token.literal = node.column.Node.children.self.Node.token.literal.toUpperCase();
  let ifExists = "";
  if ("if_exists" in node) {
    ifExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_exists"),
    ]);
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    printSelf(path, options, print, config),
    " ",
    path.call((p) => p.call(print, "Node"), "column"),
    ifExists,
    " ",
    path.call((p) => p.call(print, "Node"), "column_name"),
    comma,
  ]);
};

const printAlterStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.what.Node.children.self.Node.token.literal = node.what.Node.children.self.Node.token.literal.toUpperCase();
  let materialized = "";
  if ("materialized" in node) {
    node.materialized.Node.children.self.Node.token.literal = node.materialized.Node.children.self.Node.token.literal.toUpperCase();
    materialized = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "materialized"),
    ]);
  }
  let set = "";
  if ("set" in node) {
    set = concat([" ", path.call((p) => p.call(print, "Node"), "set")]);
  }
  let options_ = "";
  if ("options" in node) {
    node.options.Node.children.self.Node.token.literal = node.options.Node.children.self.Node.token.literal.toUpperCase();
    options_ = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "options"),
    ]);
  }
  let add_columns = "";
  if ("add_columns" in node) {
    add_columns = concat([
      line,
      path.call((p) => join(line, p.map(print, "NodeVec")), "add_columns"),
    ]);
  }
  let drop_columns = "";
  if ("drop_columns" in node) {
    drop_columns = concat([
      line,
      path.call((p) => join(line, p.map(print, "NodeVec")), "drop_columns"),
    ]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        materialized,
        " ",
        path.call((p) => p.call(print, "Node"), "what"),
        " ",
        path.call((p) => p.call(print, "Node"), "ident"),
        set,
        options_,
        add_columns,
        drop_columns,
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printProcedureArgument = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  node.in_out.Node.children.self.Node.token.literal = node.in_out.Node.children.self.Node.token.literal.toUpperCase();
  node.type.Node.children.self.Node.token.literal = node.type.Node.children.self.Node.token.literal.toUpperCase();
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    path.call((p) => p.call(print, "Node"), "in_out"),
    " ",
    printSelf(path, options, print, config),
    " ",
    path.call((p) => p.call(print, "Node"), "type"),
    comma,
  ]);
};

const printCreateSchemaStatement = (path, options, print) => {
  const node = path.getValue();
  node.what.Node.children.self.Node.token.literal = node.what.Node.children.self.Node.token.literal.toUpperCase();
  let ifNotExists = "";
  if ("if_not_exists" in node) {
    ifNotExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_not_exists"),
    ]);
  }
  let options_ = "";
  if ("options" in node) {
    node.options.Node.children.self.Node.token.literal = node.options.Node.children.self.Node.token.literal.toUpperCase();
    options = concat([" ", path.call((p) => p.call(print, "Node"), "options")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    concat([
      printSelf(path, options, print),
      " ",
      path.call((p) => p.call(print, "Node"), "what"),
      ifNotExists,
      " ",
      path.call((p) => p.call(print, "Node"), "ident"),
      options,
      semicolon,
    ]),
    endOfStatement,
  ]);
};

const printCreateProcedureStatement = (path, options, print) => {
  const node = path.getValue();
  node.what.Node.children.self.Node.token.literal = node.what.Node.children.self.Node.token.literal.toUpperCase();
  node.stmt.Node.children.notRoot = true;
  let orReplace = "";
  if ("or_replace" in node) {
    node.or_replace.NodeVec.map((x) => {
      x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
    });
    orReplace = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "or_replace"),
    ]);
  }
  let ifNotExists = "";
  if ("if_not_exists" in node) {
    ifNotExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_not_exists"),
    ]);
  }
  let options_ = "";
  if ("options" in node) {
    node.options.Node.children.self.Node.token.literal = node.options.Node.children.self.Node.token.literal.toUpperCase();
    options = concat([" ", path.call((p) => p.call(print, "Node"), "options")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    concat([
      printSelf(path, options, print),
      " ",
      path.call((p) => p.call(print, "Node"), "what"),
      ifNotExists,
      " ",
      path.call((p) => p.call(print, "Node"), "ident"),
      path.call((p) => p.call(print, "Node"), "group"),
      options,
      line,
      path.call((p) => p.call(print, "Node"), "stmt"),
      semicolon,
    ]),
    endOfStatement,
  ]);
};

const printWithPartitionColumnsClause = (path, options, print) => {
  const node = path.getValue();
  let columnSchemaGroup = "";
  if ("column_schema_group" in node) {
    columnSchemaGroup = path.call(
      (p) => p.call(print, "Node"),
      "column_schema_group"
    );
  }
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => join(" ", p.map(print, "NodeVec")), "partition_columns"),
    " ",
    columnSchemaGroup,
  ]);
};

const printSchema = (path, options, print) => {
  const node = path.getValue();
  let options_ = "";
  if ("options" in node) {
    options = concat([" ", path.call((p) => p.call(print, "Node"), "options")]);
  }
  let notNull = "";
  if ("not_null" in node) {
    notNull = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "not_null"),
    ]);
  }
  return concat([printSelf(path, options, print), options, notNull]);
};

const printColumnDefinitions = (path, options, print) => {
  const node = path.getValue();
  const columnDefinitions = path.call(
    (p) => join(" ", p.map(print, "NodeVec")),
    "column_definitions"
  );
  return concat([
    printSelf(path, options, print),
    columnDefinitions,
    path.call((p) => p.call(print, "Node"), "rparen"),
  ]);
};

const printCreateTableStatement = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  node.what.Node.children.self.Node.token.literal = node.what.Node.children.self.Node.token.literal.toUpperCase();
  let orReplace = "";
  if ("or_replace" in node) {
    node.or_replace.NodeVec.map((x) => {
      x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
    });
    orReplace = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "or_replace"),
    ]);
  }
  let temporary = "";
  if ("temp" in node) {
    node.temp.Node.children.self.Node.token.literal = "TEMPORARY";
    temporary = concat([" ", path.call((p) => p.call(print, "Node"), "temp")]);
  }
  let materialized = "";
  if ("materialized" in node) {
    node.materialized.Node.children.self.Node.token.literal = node.materialized.Node.children.self.Node.token.literal.toUpperCase();
    materialized = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "materialized"),
    ]);
  }
  let external = "";
  if ("external" in node) {
    node.external.Node.children.self.Node.token.literal = node.external.Node.children.self.Node.token.literal.toUpperCase();
    materialized = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "external"),
    ]);
  }
  let ifNotExists = "";
  if ("if_not_exists" in node) {
    ifNotExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_not_exists"),
    ]);
  }
  let columnSchemaGroup = "";
  if ("column_schema_group" in node) {
    columnSchemaGroup = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "column_schema_group"),
    ]);
  }
  let partitionby = "";
  if ("partitionby" in node) {
    partitionby = concat([
      line,
      path.call((p) => p.call(print, "Node"), "partitionby"),
    ]);
  }
  let clusterby = "";
  if ("clusterby" in node) {
    node.clusterby.Node.children.self.Node.token.literal = node.clusterby.Node.children.self.Node.token.literal.toUpperCase();
    clusterby = concat([
      line,
      path.call((p) => p.call(print, "Node"), "clusterby"),
    ]);
  }
  let withPartitionColumns = "";
  if ("with_partition_columns" in node) {
    withPartitionColumns = concat([
      line,
      path.call((p) => p.call(print, "Node"), "with_partition_columns"),
    ]);
  }
  let options_ = "";
  if ("options" in node) {
    node.options.Node.children.self.Node.token.literal = node.options.Node.children.self.Node.token.literal.toUpperCase();
    options = concat([
      line,
      path.call((p) => p.call(print, "Node"), "options"),
    ]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print, config),
        orReplace,
        temporary,
        materialized,
        external,
        " ",
        path.call((p) => p.call(print, "Node"), "what"),
        ifNotExists,
        " ",
        path.call((p) => p.call(print, "Node"), "ident"),
        columnSchemaGroup,
        partitionby,
        clusterby,
        withPartitionColumns,
        options,
        as,
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printCallStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "expr"),
    semicolon,
    endOfStatement,
  ]);
};

const printRaiseStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let using = "";
  if ("using" in node) {
    // message -> MESSAGE
    node.using.Node.children.expr.Node.children.left.Node.children.self.Node.token.literal = node.using.Node.children.expr.Node.children.left.Node.children.self.Node.token.literal.toUpperCase();
    using = concat([" ", path.call((p) => p.call(print, "Node"), "using")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    using,
    semicolon,
    endOfStatement,
  ]);
};

const printSingleWordStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([printSelf(path, options, print), semicolon, endOfStatement]);
};

const printWhileStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.stmts.NodeVec.map((x) => {
    x.children.notRoot = true;
  });
  node.end_while.NodeVec.map((x) => {
    x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
  });
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        indent(
          concat([
            line,
            path.call((p) => join(hardline, p.map(print, "NodeVec")), "stmts"),
          ])
        ),
        line,
        path.call((p) => join(" ", p.map(print, "NodeVec")), "end_while"),
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printLoopStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.stmts.NodeVec.map((x) => {
    x.children.notRoot = true;
  });
  node.end_loop.NodeVec.map((x) => {
    x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
  });
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        indent(
          concat([
            line,
            path.call((p) => join(hardline, p.map(print, "NodeVec")), "stmts"),
          ])
        ),
        line,
        path.call((p) => join(" ", p.map(print, "NodeVec")), "end_loop"),
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printElseifClause = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "condition"),
    " ",
    path.call((p) => p.call(print, "Node"), "then"),
  ]);
};

const printKeywordWithStmt = (path, options, print) => {
  const node = path.getValue();
  node.stmt.Node.children.notRoot = true;
  return group(
    concat([
      printSelf(path, options, print),
      indent(concat([line, path.call((p) => p.call(print, "Node"), "stmt")])),
    ])
  );
};

const printKeywordWithStmts = (path, options, print) => {
  const node = path.getValue();
  node.stmts.NodeVec.map((x) => {
    x.children.notRoot = true;
  });
  return group(
    concat([
      printSelf(path, options, print),
      indent(
        concat([
          line,
          path.call((p) => join(hardline, p.map(print, "NodeVec")), "stmts"),
        ])
      ),
    ])
  );
};

const printIfStatement = (path, options, print) => {
  const node = path.getValue();
  const then = path.call((p) => p.call(print, "Node"), "then");
  let elseifs = "";
  if ("elseifs" in node) {
    elseifs = concat([
      line,
      path.call((p) => join(hardline, p.map(print, "NodeVec")), "elseifs"),
    ]);
  }
  let else_ = "";
  if ("else" in node) {
    else_ = concat([line, path.call((p) => p.call(print, "Node"), "else")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        " ",
        path.call((p) => p.call(print, "Node"), "condition"),
        " ",
        then,
        elseifs,
        else_,
        line,
        path.call((p) => p.call(print, "Node"), "end"),
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printBeginStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let stmts = "";
  if ("stmts" in node) {
    node.stmts.NodeVec.map((x) => {
      x.children.notRoot = true;
    });
    stmts = indent(
      concat([
        line,
        path.call((p) => join(hardline, p.map(print, "NodeVec")), "stmts"),
      ])
    );
  }
  let exceptionWhenErrorThen = "";
  if ("exception_when_error_then" in node) {
    node.exception_when_error_then.NodeVec.map((x) => {
      x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
    });
    exceptionWhenErrorThen = concat([
      line,
      path.call(
        (p) => join(" ", p.map(print, "NodeVec")),
        "exception_when_error_then"
      ),
    ]);
  }
  let exceptionStmt = "";
  if ("exception_stmts" in node) {
    node.exception_stmts.NodeVec.map((x) => {
      x.children.notRoot = true;
    });
    exceptionStmt = indent(
      concat([
        line,
        path.call(
          (p) => join(hardline, p.map(print, "NodeVec")),
          "exception_stmts"
        ),
      ])
    );
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        stmts,
        exceptionWhenErrorThen,
        exceptionStmt,
        line,
        path.call((p) => p.call(print, "Node"), "end"),
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printExecuteStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.immediate.Node.children.self.Node.token.literal = node.immediate.Node.children.self.Node.token.literal.toUpperCase();
  let using = "";
  if ("using" in node) {
    using = concat([" ", path.call((p) => p.call(print, "Node"), "using")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "immediate"),
    " ",
    path.call((p) => p.call(print, "Node"), "sql_expr"),
    using,
    semicolon,
    endOfStatement,
  ]);
};

const printSetStatement = (path, options, print) => {
  const node = path.getValue();
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "expr"),
    semicolon,
    endOfStatement,
  ]);
};

const printDeclareStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let variableType = "";
  if ("variable_type" in node) {
    node.variable_type.Node.children.self.Node.token.literal = node.variable_type.Node.children.self.Node.token.literal.toUpperCase();
    variableType = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "variable_type"),
    ]);
  }
  let default_ = "";
  if ("default" in node) {
    default_ = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "default"),
    ]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => join(" ", p.map(print, "NodeVec")), "idents"),
    variableType,
    default_,
    semicolon,
    endOfStatement,
  ]);
};

const printCreateFunctionStatement = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  // TEMPORARY
  let temporary = "";
  if ("temp" in node) {
    node.temp.Node.children.self.Node.token.literal = "TEMPORARY";
    temporary = concat([" ", path.call((p) => p.call(print, "Node"), "temp")]);
  }
  // OR REPLACE
  let orReplace = "";
  if ("or_replace" in node) {
    node.or_replace.NodeVec.map((x) => {
      x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
    });
    orReplace = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "or_replace"),
    ]);
  }
  node.what.Node.children.self.Node.token.literal = node.what.Node.children.self.Node.token.literal.toUpperCase();
  // IF NOT EXISTS
  let ifNotExists = "";
  if ("if_not_exists" in node) {
    node.if_not_exists.NodeVec.map((x) => {
      x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
    });
    ifNotExists = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "if_not_exists"),
    ]);
  }
  // RETURNS
  let returnType = "";
  if ("returns" in node) {
    node.returns.Node.children.self.Node.token.literal = node.returns.Node.children.self.Node.token.literal.toUpperCase();
    returnType = concat([
      line,
      path.call((p) => p.call(print, "Node"), "returns"), // guessed as identAndType
    ]);
  }
  // DETERMINISTIC
  let determinism = "";
  if ("determinism" in node) {
    node.determinism.Node.children.self.Node.token.literal = node.determinism.Node.children.self.Node.token.literal.toUpperCase();
    if ("right" in node.determinism.Node.children) {
      node.determinism.Node.children.right.Node.children.self.Node.token.literal = node.determinism.Node.children.right.Node.children.self.Node.token.literal.toUpperCase();
    }
    determinism = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "determinism"),
    ]);
  }
  // LANGUAGE js
  let language = "";
  if ("language" in node) {
    language = concat([
      line,
      path.call((p) => p.call(print, "Node"), "language"),
    ]);
  }
  // OPTIONS
  let options_ = "";
  if ("options" in node) {
    options_ = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "options"),
    ]);
  }
  // AS function_definition
  const as_ = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  // ;
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print, config),
        orReplace,
        temporary,
        " ",
        path.call((p) => p.call(print, "Node"), "what"),
        ifNotExists,
        " ",
        path.call((p) => p.call(print, "Node"), "ident"),
        path.call((p) => p.call(print, "Node"), "group"),
        returnType,
        determinism,
        language,
        options_,
        as_,
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printLanguage = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.language.Node.token.literal = node.language.Node.token.literal.toUpperCase();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "language"),
  ]);
};

const printNamedParameter = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    path.call((p) => join(" ", p.map(print, "NodeVec")), "args"),
    path.call((p) => p.call(print, "Node"), "rparen"),
  ]);
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  // with
  let with_ = "";
  if ("with" in node) {
    with_ = concat([path.call((p) => p.call(print, "Node"), "with"), line]);
  }
  // as
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  // distinct
  let distinct = "";
  if ("distinct" in node) {
    distinct = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "distinct"),
    ]);
  }
  // select
  const select = concat([
    printSelf(path, options, print, config),
    as,
    distinct,
    indent(
      path.call(
        (p) =>
          concat(p.map(print, "NodeVec").map((x) => concat([line, group(x)]))),
        "exprs"
      )
    ),
  ]);
  // from
  let from = "";
  if ("from" in node) {
    from = concat([
      line,
      group(path.call((p) => p.call(print, "Node"), "from")),
    ]);
  }
  // window
  let window = "";
  if ("window" in node) {
    window = concat([line, path.call((p) => p.call(print, "Node"), "window")]);
  }
  // where
  let where = "";
  if ("where" in node) {
    where = concat([line, path.call((p) => p.call(print, "Node"), "where")]);
  }
  // group by
  let groupby = "";
  if ("groupby" in node) {
    groupby = concat([
      line,
      group(path.call((p) => p.call(print, "Node"), "groupby")),
    ]);
  }
  // having
  let having = "";
  if ("having" in node) {
    having = concat([
      line,
      group(path.call((p) => p.call(print, "Node"), "having")),
    ]);
  }
  // order by
  let orderby = "";
  if ("orderby" in node) {
    orderby = concat([
      line,
      group(path.call((p) => p.call(print, "Node"), "orderby")),
    ]);
  }
  // limit
  let limit = "";
  if ("limit" in node) {
    limit = concat([
      line,
      group(path.call((p) => p.call(print, "Node"), "limit")),
    ]);
  }
  // semicolon
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = concat([
      softline,
      path.call((p) => p.call(print, "Node"), "semicolon"),
    ]);
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        with_,
        select,
        from,
        where,
        groupby,
        having,
        window,
        orderby,
        limit,
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printAsStructOrValue = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "struct_value"),
  ]);
};

const printWithQuery = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    printSelf(path, options, print, config),
    " ",
    path.call((p) => p.call(print, "Node"), "as"),
    " ",
    path.call((p) => p.call(print, "Node"), "stmt"),
    comma,
  ]);
};

const printWithQueries = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    indent(
      concat([
        line,
        path.call((p) => join(line, p.map(print, "NodeVec")), "queries"),
      ])
    ),
  ]);
};

const printUnnestWithOffset = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printFunc(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "with"),
  ]);
};

const printWithOffset = (path, options, print) => {
  const node = path.getValue();
  node.unnest_offset.Node.children.self.Node.token.literal = node.unnest_offset.Node.children.self.Node.token.literal.toUpperCase();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "unnest_offset"),
  ]);
};

const printGroupedStatement = (path, options, print) => {
  const node = path.getValue();
  let semicolon = "";
  let endOfStatement = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
    endOfStatement = hardline;
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        indent(
          concat([softline, path.call((p) => p.call(print, "Node"), "stmt")])
        ),
        softline,
        path.call((p) => p.call(print, "Node"), "rparen"),
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printNullOrder = (path, options, print) => {
  const node = path.getValue();
  node.first.Node.children.self.Node.token.literal = node.first.Node.children.self.Node.token.literal.toUpperCase();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "first"),
  ]);
};

const printJoinType = (path, options, print) => {
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "outer"),
  ]);
};

const printKeywordWithExpr = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  return group(
    concat([
      printSelf(path, options, print),
      indent(concat([line, path.call((p) => p.call(print, "Node"), "expr")])),
    ])
  );
};

const printKeywordWithExprs = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  return group(
    concat([
      printSelf(path, options, print),
      " ",
      path.call((p) => join(line, p.map(print, "NodeVec")), "exprs"),
    ])
  );
};

const printKeywordWithGroupedExprs = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "group"),
  ]);
};

const printAs = (path, options, print) => {
  const node = path.getValue();
  let as = "";
  if ("self" in node) {
    as = concat([printSelf(path, options, print), " "]);
  }
  return concat([as, path.call((p) => p.call(print, "Node"), "alias")]);
};

const printFunc = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let sep = "";
  if (node.func.Node.token.literal.toLowerCase() === "exists") {
    sep = " ";
  }
  if (
    globalFunctions.indexOf(node.func.Node.token.literal.toUpperCase()) !== -1
  ) {
    node.func.Node.children.self.Node.token.literal = node.func.Node.token.literal.toUpperCase();
  }
  let distinct = "";
  if ("distinct" in node) {
    node.distinct.Node.children.self.Node.token.literal = node.distinct.Node.children.self.Node.token.literal.toUpperCase();
    distinct = concat([
      path.call((p) => p.call(print, "Node"), "distinct"),
      " ",
    ]);
  }
  let args = "";
  let rsep = softline;
  if ("args" in node) {
    switch (node.func.Node.token.literal.toUpperCase()) {
      // NORMALEZE
      case "NORMALIZE":
        if (2 <= node.args.NodeVec.length) {
          node.args.NodeVec[1].children.self.Node.token.literal = node.args.NodeVec[1].children.self.Node.token.literal.toUpperCase();
        }
        break;
      case "NORMALIZE_AND_CASEFOLD":
        if (2 <= node.args.NodeVec.length) {
          node.args.NodeVec[1].children.self.Node.token.literal = node.args.NodeVec[1].children.self.Node.token.literal.toUpperCase();
        }
        break;
      // XXX_DIFF
      case "DATE_DIFF":
        replaceDatePartWithUpperCase(node.args.NodeVec[2]);
        break;
      case "DATETIME_DIFF":
        replaceDatePartWithUpperCase(node.args.NodeVec[2]);
        break;
      case "TIME_DIFF":
        replaceDatePartWithUpperCase(node.args.NodeVec[2]);
        break;
      case "TIMESTAMP_DIFF":
        replaceDatePartWithUpperCase(node.args.NodeVec[2]);
        break;
      // XXX_TRUNC
      case "DATE_TRUNC":
        replaceDatePartWithUpperCase(node.args.NodeVec[1]);
        break;
      case "DATETIME_TRUNC":
        replaceDatePartWithUpperCase(node.args.NodeVec[1]);
        break;
      case "TIME_TRUNC":
        replaceDatePartWithUpperCase(node.args.NodeVec[1]);
        break;
      case "TIMESTAMP_TRUNC":
        replaceDatePartWithUpperCase(node.args.NodeVec[1]);
        break;
      // LAST_DAY
      case "LAST_DAY":
        if (2 <= node.args.NodeVec.length) {
          replaceDatePartWithUpperCase(node.args.NodeVec[1]);
        }
        break;
    }
    if (
      node.args.NodeVec.length === 1 &&
      "func" in node.args.NodeVec[0].children
    ) {
      rsep = "";
      args = path.call(
        (p) => p.map(print, "NodeVec").map((x) => group(x))[0],
        "args"
      );
    } else {
      args = indent(
        concat([
          softline,
          path.call(
            (p) =>
              join(
                line,
                p.map(print, "NodeVec").map((x) => group(x))
              ),
            "args"
          ),
        ])
      );
    }
  }
  let ignoreNulls = "";
  if ("ignore_nulls" in node) {
    ignoreNulls = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "ignore_nulls"),
    ]);
  }
  let orderBy = "";
  if ("orderby" in node) {
    orderBy = concat([" ", path.call((p) => p.call(print, "Node"), "orderby")]);
  }
  let over = "";
  if ("over" in node) {
    over = concat([" ", path.call((p) => p.call(print, "Node"), "over")]);
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let limit = "";
  if ("limit" in node) {
    limit = concat([" ", path.call((p) => p.call(print, "Node"), "limit")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return group(
    concat([
      path.call((p) => p.call(print, "Node"), "func"),
      sep,
      printSelf(path, options, print, config),
      distinct,
      args,
      ignoreNulls,
      orderBy,
      limit,
      rsep,
      path.call((p) => p.call(print, "Node"), "rparen"),
      over,
      order,
      as,
      comma,
    ])
  );
};

const replaceDatePartWithUpperCase = (node) => {
  if (node.children.self.Node.token.literal === "(") {
    node.children.func.Node.children.self.Node.token.literal = node.children.func.Node.children.self.Node.token.literal.toUpperCase(); // WEEK
    node.children.args.NodeVec[0].children.self.Node.token.literal = node.children.args.NodeVec[0].children.self.Node.token.literal.toUpperCase();
  } else {
    node.children.self.Node.token.literal = node.children.self.Node.token.literal.toUpperCase();
  }
};

const printLimitClause = (path, options, print) => {
  const node = path.getValue();
  return group(
    concat([
      printKeywordWithExpr(path, options, print),
      line,
      path.call((p) => p.call(print, "Node"), "offset"),
    ])
  );
};

const printBinaryOperator = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  const uppercasePrefix = [
    "SAFE",
    "KEYS",
    "AEAD",
    "NET",
    "HLL_COUNT",
    "_SESSION",
  ];
  if (node.self.Node.token.literal === ".") {
    node.right.Node.children.notGlobal = true;
    if (
      uppercasePrefix.indexOf(
        node.left.Node.children.self.Node.token.literal.toUpperCase()
      ) !== -1
    ) {
      node.left.Node.children.self.Node.token.literal = node.left.Node.children.self.Node.token.literal.toUpperCase();
      if ("func" in node.right.Node.children) {
        // except for _SESSION
        node.right.Node.children.func.Node.children.self.Node.token.literal = node.right.Node.children.func.Node.children.self.Node.token.literal.toUpperCase();
      }
    }
  }
  const noSpaceOperators = ["."];
  const leftLineOperators = ["OR", "AND"];
  const leftSoftLineOperators = [","];
  let lsep = " ";
  let rsep = " ";
  if (noSpaceOperators.indexOf(node.self.Node.token.literal) !== -1) {
    lsep = "";
    rsep = "";
  } else if (
    leftLineOperators.indexOf(node.self.Node.token.literal.toUpperCase()) !== -1
  ) {
    lsep = line;
  } else if (
    leftSoftLineOperators.indexOf(node.self.Node.token.literal) !== -1
  ) {
    lsep = softline;
  }
  let operator;
  if (node.self.Node.token.literal.toUpperCase() === "IS") {
    let not = "";
    if ("not" in node) {
      not = concat([" ", path.call((p) => p.call(print, "Node"), "not")]);
    }
    operator = concat([printSelf(path, options, print, config), not]);
  } else {
    let not = "";
    if ("not" in node) {
      not = concat([path.call((p) => p.call(print, "Node"), "not"), " "]);
    }
    operator = concat([not, printSelf(path, options, print, config)]);
  }
  let joinType = "";
  if ("join_type" in node) {
    joinType = concat([
      path.call((p) => p.call(print, "Node"), "join_type"),
      " ",
    ]);
  }
  let outer = "";
  if ("outer" in node) {
    outer = concat([path.call((p) => p.call(print, "Node"), "outer"), " "]);
  }
  let on = "";
  if ("on" in node) {
    on = concat([" ", path.call((p) => p.call(print, "Node"), "on")]);
  }
  let using = "";
  if ("using" in node) {
    using = concat([" ", path.call((p) => p.call(print, "Node"), "using")]);
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return concat([
    path.call((p) => p.call(print, "Node"), "left"),
    lsep,
    concat([
      joinType,
      outer,
      operator,
      rsep,
      path.call((p) => p.call(print, "Node"), "right"),
      on,
      using,
      order,
      as,
      comma,
    ]),
  ]);
};

const printTableName = (path, options, print) => {
  const node = path.getValue();
  let forSystemTimeAsOf = "";
  if ("for_system_time_as_of" in node) {
    forSystemTimeAsOf = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "for_system_time_as_of"),
    ]);
  }
  let tablesample = "";
  if ("tablesample" in node) {
    tablesample = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "tablesample"),
    ]);
  }
  return concat([
    printSelf(path, options, print),
    forSystemTimeAsOf,
    tablesample,
  ]);
};

const printForSystemTimeAsOfClause = (path, options, print) => {
  const node = path.getValue();
  node.system_time_as_of.NodeVec.map((x) => {
    x.children.self.Node.token.literal = x.children.self.Node.token.literal.toUpperCase();
  });
  return join(" ", [
    printSelf(path, options, print),
    path.call((p) => join(" ", p.map(print, "NodeVec")), "system_time_as_of"),
    path.call((p) => p.call(print, "Node"), "expr"),
  ]);
};

const printCaseExpr = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let expr = "";
  if ("expr" in node) {
    expr = concat([" ", path.call((p) => p.call(print, "Node"), "expr")]);
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return group(
    concat([
      printSelf(path, options, print, config),
      expr,
      indent(
        concat([
          line,
          path.call((p) => join(line, p.map(print, "NodeVec")), "arms"),
          " ",
          path.call((p) => p.call(print, "Node"), "end"),
          order,
          as,
          comma,
        ])
      ),
    ])
  );
};

const printXXXByExpr = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "by"),
    " ",
    path.call((p) => p.call(print, "Node"), "expr"),
  ]);
};

const printXXXByExprs = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "by"),
    " ",
    path.call((p) => join(line, p.map(print, "NodeVec")), "exprs"),
  ]);
};

const printOverClause = (path, options, print) => {
  const node = path.getValue();
  let win = path.call((p) => p.call(print, "Node"), "window");
  return group(concat([printSelf(path, options, print), " ", win]));
};

const printWindowSpecification = (path, options, print) => {
  const node = path.getValue();
  let contents = [];
  if ("name" in node) {
    contents.push(path.call((p) => p.call(print, "Node"), "name"));
  }
  if ("partitionby" in node) {
    contents.push(
      group(path.call((p) => p.call(print, "Node"), "partitionby"))
    );
  }
  if ("orderby" in node) {
    contents.push(group(path.call((p) => p.call(print, "Node"), "orderby")));
  }
  if ("frame" in node) {
    contents.push(path.call((p) => p.call(print, "Node"), "frame"));
  }
  let rparen = "";
  if ("rparen" in node) {
    rparen = path.call((p) => p.call(print, "Node"), "rparen");
  }
  return group(
    concat([
      printSelf(path, options, print),
      indent(concat([softline, join(line, contents)])),
      softline,
      rparen,
    ])
  );
};

const printWindowFrameClause = (path, options, print) => {
  const node = path.getValue();
  let contents = [];
  contents.push(printSelf(path, options, print));
  if ("between" in node) {
    contents.push(path.call((p) => p.call(print, "Node"), "between"));
  }
  if ("start" in node) {
    contents.push(path.call((p) => p.call(print, "Node"), "start"));
  }
  if ("and" in node) {
    contents.push(path.call((p) => p.call(print, "Node"), "and"));
  }
  if ("end" in node) {
    contents.push(path.call((p) => p.call(print, "Node"), "end"));
  }
  return group(join(" ", contents));
};

const printWindowClause = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    indent(
      concat([
        line,
        path.call((p) => join(line, p.map(print, "NodeVec")), "window_exprs"),
      ])
    ),
  ]);
};

const printWindowExprs = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    printSelf(path, options, print, config),
    " ",
    path.call((p) => p.call(print, "Node"), "as"),
    " ",
    path.call((p) => p.call(print, "Node"), "window"),
    comma,
  ]);
};

const printFrameStartOrEnd = (path, options, print) => {
  const node = path.getValue();
  let preceding = "";
  if ("preceding" in node) {
    preceding = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "preceding"),
    ]);
    delete node.preceding;
  }
  let following = "";
  if ("following" in node) {
    following = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "following"),
    ]);
    delete node.following;
  }
  return concat([
    path.call(print), // TODO refuctoring
    preceding,
    following,
  ]);
};

const printCaseArm = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let whenExprThen;
  if ("expr" in node) {
    // when
    whenExprThen = concat([
      join(" ", [
        printSelf(path, options, print, config),
        path.call((p) => p.call(print, "Node"), "expr"),
        path.call((p) => p.call(print, "Node"), "then"),
      ]),
      " ",
    ]);
  } else {
    // else
    whenExprThen = concat([printSelf(path, options, print, config), " "]);
  }
  return concat([
    whenExprThen,
    path.call((p) => p.call(print, "Node"), "result"),
  ]);
};

const printUnaryOperator = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  const upperCaseOperators = [
    "DATE",
    "TIMESTAMP",
    "TIME",
    "DATETIME",
    "NUMERIC",
    "BIGNUMERIC",
    "DECIMAL",
    "BIGDECIMAL",
  ];
  const lowerCaseOperators = ["br", "r", "rb", "b"];
  const noSpaceOperators = [
    "+",
    "-",
    "~",
    "br",
    "r",
    "rb",
    "b",
    "array",
    "struct",
  ];
  if (
    upperCaseOperators.indexOf(node.self.Node.token.literal.toUpperCase()) !==
    -1
  ) {
    node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  } else if (
    lowerCaseOperators.indexOf(node.self.Node.token.literal.toLowerCase()) !==
    -1
  ) {
    node.self.Node.token.literal = node.self.Node.token.literal.toLowerCase();
  }
  let self = printSelf(path, options, print, config);
  if (
    noSpaceOperators.indexOf(node.self.Node.token.literal.toLowerCase()) === -1
  ) {
    self = concat([self, " "]);
  }
  let typeDeclaration = "";
  if ("type_declaration" in node) {
    typeDeclaration = path.call(
      (p) => p.call(print, "Node"),
      "type_declaration"
    );
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return concat([
    self,
    typeDeclaration,
    path.call((p) => p.call(print, "Node"), "right"),
    order,
    as,
    comma,
  ]);
};

const printIntervalLiteral = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  node.date_part.Node.children.self.Node.token.literal = node.date_part.Node.children.self.Node.token.literal.toUpperCase();
  const date_part = path.call((p) => p.call(print, "Node"), "date_part");
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return concat([
    printSelf(path, options, print, config),
    " ",
    path.call((p) => p.call(print, "Node"), "right"),
    " ",
    date_part,
    order,
    as,
    comma,
  ]);
};

const printGroupedExpr = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  if (node.expr.Node.children.self.Node.token.literal === "(") {
    return group(
      concat([
        printSelf(path, options, print, config),
        group(path.call((p) => p.call(print, "Node"), "expr")),
        path.call((p) => p.call(print, "Node"), "rparen"),
        order,
        as,
        comma,
      ])
    );
  } else {
    return group(
      concat([
        printSelf(path, options, print, config),
        group(
          indent(
            concat([softline, path.call((p) => p.call(print, "Node"), "expr")])
          )
        ),
        softline,
        path.call((p) => p.call(print, "Node"), "rparen"),
        order,
        as,
        comma,
      ])
    );
  }
};

const printGroupedExprs = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return group(
    concat([
      printSelf(path, options, print, config),
      indent(
        concat([
          softline,
          path.call((p) => join(" ", p.map(print, "NodeVec")), "exprs"),
        ])
      ),
      softline,
      path.call((p) => p.call(print, "Node"), "rparen"),
      order,
      as,
      comma,
    ])
  );
};

const printArrayAccess = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return concat([
    path.call((p) => p.call(print, "Node"), "left"),
    printSelf(path, options, print, config),
    path.call((p) => p.call(print, "Node"), "right"),
    path.call((p) => p.call(print, "Node"), "rparen"),
    order,
    as,
    comma,
  ]);
};

const printTypeDeclaration = (path, options, print) => {
  const node = path.getValue();
  let type = "";
  if ("type" in node) {
    node.type.Node.children.self.Node.token.literal = node.type.Node.children.self.Node.token.literal.toUpperCase();
    type = path.call((p) => p.call(print, "Node"), "type");
  }
  let declarations = "";
  if ("declarations" in node) {
    declarations = path.call(
      (p) => join(" ", p.map(print, "NodeVec")),
      "declarations"
    );
  }
  return concat([
    printSelf(path, options, print),
    type,
    declarations,
    path.call((p) => p.call(print, "Node"), "rparen"),
  ]);
};

const printIdentAndType = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  node.type.Node.children.self.Node.token.literal = node.type.Node.children.self.Node.token.literal.toUpperCase();
  let ident = "";
  if ("self" in node) {
    ident = printSelf(path, options, print, config);
  }
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    ident,
    " ",
    path.call((p) => p.call(print, "Node"), "type"),
    comma,
  ]);
};

const printStructOrArrayType = (path, options, print) => {
  const node = path.getValue();
  return concat([
    printSelf(path, options, print),
    path.call((p) => p.call(print, "Node"), "type_declaration"),
  ]);
};

const printBetweenOperator = (path, options, print) => {
  const node = path.getValue();
  const config = {
    printComma: false,
    printAlias: false,
    printOrder: false,
  };
  let not = "";
  if ("not" in node) {
    not = concat([" ", path.call((p) => p.call(print, "Node"), "not")]);
  }
  const min = path.call((p) => p.map(print, "NodeVec")[0], "right");
  const max = path.call((p) => p.map(print, "NodeVec")[1], "right");
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  let order = "";
  if ("order" in node) {
    order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
  }
  let as = "";
  if ("as" in node) {
    as = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
  }
  return concat([
    path.call((p) => p.call(print, "Node"), "left"),
    not,
    " ",
    printSelf(path, options, print, config),
    " ",
    min,
    " ",
    path.call((p) => p.call(print, "Node"), "and"),
    " ",
    max,
    order,
    as,
    comma,
  ]);
};

const printSetOperator = (path, options, print) => {
  const node = path.getValue();
  let semicolon = "";
  let endOfStatement = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
    endOfStatement = hardline;
  }
  return concat([
    group(
      concat([
        path.call((p) => p.call(print, "Node"), "left"),
        line,
        printSelf(path, options, print),
        " ",
        path.call((p) => p.call(print, "Node"), "distinct"),
        line,
        path.call((p) => p.call(print, "Node"), "right"),
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printCastArgument = (path, options, print) => {
  const node = path.getValue();
  node.cast_to.Node.children.self.Node.token.literal = node.cast_to.Node.children.self.Node.token.literal.toUpperCase();
  return join(" ", [
    path.call((p) => p.call(print, "Node"), "cast_from"),
    printSelf(path, options, print),
    path.call((p) => p.call(print, "Node"), "cast_to"),
  ]);
};

const printIgnoreOrReplaceNulls = (path, options, print) => {
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "nulls"),
  ]);
};

const printExtractArgument = (path, options, print) => {
  const node = path.getValue();
  if (node.extract_datepart.Node.children.self.Node.token.literal === "(") {
    node.extract_datepart.Node.children.func.Node.children.self.Node.token.literal = node.extract_datepart.Node.children.func.Node.children.self.Node.token.literal.toUpperCase();
    node.extract_datepart.Node.children.args.NodeVec[0].children.self.Node.token.literal = node.extract_datepart.Node.children.args.NodeVec[0].children.self.Node.token.literal.toUpperCase();
  } else {
    node.extract_datepart.Node.children.self.Node.token.literal = node.extract_datepart.Node.children.self.Node.token.literal.toUpperCase();
  }
  return concat([
    path.call((p) => p.call(print, "Node"), "extract_datepart"),
    " ",
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "extract_from"),
  ]);
};

const printInsertStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let into = "";
  if ("into" in node) {
    into = concat([" ", path.call((p) => p.call(print, "Node"), "into")]);
  }
  let target_name = "";
  if ("target_name" in node) {
    target_name = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "target_name"),
    ]);
  }
  let columns = "";
  if ("columns" in node) {
    columns = concat([" ", path.call((p) => p.call(print, "Node"), "columns")]);
  }
  let input = concat([" ", path.call((p) => p.call(print, "Node"), "input")]);
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    into,
    target_name,
    columns,
    input,
    semicolon,
    endOfStatement,
  ]);
};

const printTruncateStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  node.table.Node.children.self.Node.token.literal = node.table.Node.children.self.Node.token.literal.toUpperCase();
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    " ",
    path.call((p) => p.call(print, "Node"), "table"),
    " ",
    path.call((p) => p.call(print, "Node"), "target_name"),
    semicolon,
    endOfStatement,
  ]);
};

const printMergeStatement = (path, options, print) => {
  const node = path.getValue();
  const target_name = concat([
    " ",
    path.call((p) => p.call(print, "Node"), "target_name"),
  ]);
  let into = "";
  if ("into" in node) {
    into = concat([" ", path.call((p) => p.call(print, "Node"), "into")]);
  }
  const using = concat([" ", path.call((p) => p.call(print, "Node"), "using")]);
  const on = concat([" ", path.call((p) => p.call(print, "Node"), "on")]);
  const whens = path.call((p) => join(line, p.map(print, "NodeVec")), "whens");
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    target_name,
    into,
    using,
    on,
    line,
    whens,
    softline,
    semicolon,
    endOfStatement,
  ]);
};

const printWhenClause = (path, options, print) => {
  const node = path.getValue();
  let not = "";
  if ("not" in node) {
    not = concat([" ", path.call((p) => p.call(print, "Node"), "not")]);
  }
  node.matched.Node.children.self.Node.token.literal = node.matched.Node.children.self.Node.token.literal.toUpperCase();
  const matched = concat([
    " ",
    path.call((p) => p.call(print, "Node"), "matched"),
  ]);
  let byTarget = "";
  if ("by_target" in node) {
    node.by_target.NodeVec[1].children.self.Node.token.literal = node.by_target.NodeVec[1].children.self.Node.token.literal.toUpperCase();
    byTarget = concat([
      " ",
      path.call((p) => join(" ", p.map(print, "NodeVec")), "by_target"),
    ]);
  }
  let and = "";
  if ("and" in node) {
    and = concat([" ", path.call((p) => p.call(print, "Node"), "and")]);
  }
  const then = concat([" ", path.call((p) => p.call(print, "Node"), "then")]);
  const stmt = concat([line, path.call((p) => p.call(print, "Node"), "stmt")]);
  return group(
    concat([
      printSelf(path, options, print),
      not,
      matched,
      byTarget,
      and,
      then,
      indent(stmt),
    ])
  );
};

const printUpdateStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let target_name = "";
  if ("target_name" in node) {
    target_name = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "target_name"),
    ]);
  }
  const set = concat([line, path.call((p) => p.call(print, "Node"), "set")]);
  let from = "";
  if ("from" in node) {
    from = concat([line, path.call((p) => p.call(print, "Node"), "from")]);
  }
  let where = "";
  if ("where" in node) {
    where = concat([line, path.call((p) => p.call(print, "Node"), "where")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    group(
      concat([
        printSelf(path, options, print),
        target_name,
        set,
        from,
        where,
        softline,
        semicolon,
      ])
    ),
    endOfStatement,
  ]);
};

const printDeleteStatement = (path, options, print) => {
  const node = path.getValue();
  node.self.Node.token.literal = node.self.Node.token.literal.toUpperCase();
  let from = "";
  if ("from" in node) {
    from = concat([" ", path.call((p) => p.call(print, "Node"), "from")]);
  }
  let target_name = "";
  if ("target_name" in node) {
    target_name = concat([
      " ",
      path.call((p) => p.call(print, "Node"), "target_name"),
    ]);
  }
  let where = "";
  if ("where" in node) {
    where = concat([" ", path.call((p) => p.call(print, "Node"), "where")]);
  }
  let semicolon = "";
  if ("semicolon" in node) {
    semicolon = path.call((p) => p.call(print, "Node"), "semicolon");
  }
  // end of statement
  let endOfStatement = "";
  if ("semicolon" in node && !node.notRoot) {
    if ("emptyLines" in node && 0 < node.emptyLines) {
      endOfStatement = concat([hardline, hardline]);
    } else {
      endOfStatement = hardline;
    }
  }
  return concat([
    printSelf(path, options, print),
    from,
    target_name,
    where,
    semicolon,
    endOfStatement,
  ]);
};

const printSelf = (
  path,
  options,
  print,
  config = { printComma: true, printAlias: true, printOrder: true }
) => {
  const { printComma, printAlias, printOrder } = config;
  const node = path.getValue();
  // leading_comments
  let leading_comments = "";
  if ("leading_comments" in node) {
    leading_comments = concat([
      // leading lineSuffixBoundary might be needed
      concat(
        node.leading_comments.NodeVec.map(
          (x) => concat([x.token.literal, hardline]) // literallineWithoutBreakParent may be better
        )
      ),
    ]);
  }
  // self
  let self = node.self.Node.token.literal;
  if (!node.notGlobal) {
    if (
      reservedKeywords.indexOf(self.toUpperCase()) !== -1 ||
      // Field names are not allowed to start with the (case-insensitive) prefixes _PARTITION, _TABLE_, _FILE_ and _ROW_TIMESTAMP
      self.match(/^_partition/i) ||
      self.match(/^_table_/i) ||
      self.match(/^_file_/i) ||
      self.match(/^_row_timestamp/i)
    ) {
      self = self.toUpperCase();
    }
  }
  // except
  let except = "";
  if ("except" in node) {
    except = concat([" ", path.call((p) => p.call(print, "Node"), "except")]);
  }
  // replace
  let replace = "";
  if ("replace" in node) {
    node.replace.Node.children.self.Node.token.literal = node.replace.Node.children.self.Node.token.literal.toUpperCase();
    replace = concat([" ", path.call((p) => p.call(print, "Node"), "replace")]);
  }
  // order
  let order = "";
  let null_order = "";
  if (printOrder) {
    if ("order" in node) {
      order = concat([" ", path.call((p) => p.call(print, "Node"), "order")]);
    }
    if ("null_order" in node) {
      null_order = concat([
        " ",
        path.call((p) => p.call(print, "Node"), "null_order"),
      ]);
    }
  }
  // comma
  let comma = "";
  if (printComma) {
    if ("comma" in node) {
      comma = path.call((p) => p.call(print, "Node"), "comma");
    }
  }
  // following_comments
  let following_comments = "";
  if ("following_comments" in node) {
    following_comments = lineSuffix(
      concat(
        node.following_comments.NodeVec.map((x) =>
          concat([" ", x.token.literal])
        )
      )
    );
  }
  // alias
  let alias = "";
  if (printAlias) {
    if ("as" in node) {
      alias = concat([" ", path.call((p) => p.call(print, "Node"), "as")]);
    }
  }
  return concat([
    leading_comments,
    self,
    except,
    replace,
    order,
    null_order,
    alias,
    comma,
    following_comments,
  ]);
};

const guess_node_type = (node) => {
  if ("children" in node) {
    return "parent";
  } else {
    if ("system" in node) return "tablesampleClause";
    if ("percent" in node) return "tablesamplePercent";
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "ADD" &&
      "column" in node
    ) {
      return "addColumnCluase";
    }
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "DROP" &&
      "column" in node
    ) {
      return "dropColumnCluase";
    }
    if ("column_definitions" in node) return "columnDefinitions";
    if ("in_out" in node) return "procedureArgument";
    if ("partition_columns" in node) return "withPartitionColumnsClause";
    if ("with" in node && "func" in node) return "unnestWithOffset";
    if ("cast_from" in node) return "castArgument";
    if ("nulls" in node) return "ignoreOrReplaceNulls";
    if ("func" in node) return "func";
    if ("extract_datepart" in node) return "extractArgument";
    if ("args" in node) return "namedParameter"; // (x int64)
    if ("window_exprs" in node) return "windowClause"; // window abc as (partition by 1)
    if ("outer" in node) return "joinType";
    if ("first" in node) return "nullOrder";
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "CREATE" &&
      "what" in node &&
      node.what.Node.children.self.Node.token.literal.toUpperCase() ==
        "FUNCTION"
    ) {
      return "createFunctionStatement";
    }
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "CREATE" &&
      "what" in node &&
      node.what.Node.children.self.Node.token.literal.toUpperCase() == "TABLE"
    ) {
      return "createTableStatement";
    }
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "CREATE" &&
      "what" in node &&
      node.what.Node.children.self.Node.token.literal.toUpperCase() == "VIEW"
    ) {
      return "createViewStatement";
    }
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "CREATE" &&
      "what" in node &&
      node.what.Node.children.self.Node.token.literal.toUpperCase() ==
        "PROCEDURE"
    ) {
      return "createProcedureStatement";
    }
    if (
      "self" in node &&
      "Node" in node.self &&
      node.self.Node.token.literal.toUpperCase() === "CREATE" &&
      "what" in node &&
      node.what.Node.children.self.Node.token.literal.toUpperCase() == "SCHEMA"
    ) {
      return "createSchemaStatement";
    }
    if ("group" in node) return "keywordWithGroupedExprs";
    if ("struct_value" in node) return "asStructOrValue";
    if (("type" in node || "declarations" in node) && "rparen" in node) {
      return "typeDeclaration";
    } // <int64>, <x int64>
    if ("type" in node) return "identAndType"; // x int64
    if ("alias" in node) return "as";
    if ("start" in node) return "windowFrameClause"; // rows between 2 preceding and 2 following
    if ("preceding" in node || "following" in node) return "frameStartOrEnd";
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "insert"
    ) {
      return "insertStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "select"
    ) {
      return "selectStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "truncate"
    ) {
      return "truncateStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "update"
    ) {
      return "updateStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "delete"
    ) {
      return "deleteStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "merge"
    ) {
      return "mergeStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "declare"
    ) {
      return "declareStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "set" &&
      "expr" in node
    ) {
      return "setStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "execute"
    ) {
      return "executeStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "begin"
    ) {
      return "beginStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "if" &&
      "condition" in node
    ) {
      return "ifStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "elseif" &&
      "condition" in node
    ) {
      return "elseifClause";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "loop" &&
      "end_loop" in node
    ) {
      return "loopStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "while" &&
      "end_while" in node
    ) {
      return "whileStatement";
    }
    if (
      "Node" in node.self &&
      ["iterate", "break", "leave", "continue"].indexOf(
        node.self.Node.token.literal.toLowerCase()
      ) !== -1
    ) {
      return "singleWordStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "raise"
    ) {
      return "raiseStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "call"
    ) {
      return "callStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "alter"
    ) {
      return "alterStatement";
    }
    if (
      "Node" in node.self &&
      node.self.Node.token.literal.toLowerCase() === "drop"
    ) {
      return "dropStatement";
    }
    if ("right" in node && "left" in node && "and" in node) {
      return "betweenOperator";
    }
    if (
      "right" in node &&
      "left" in node &&
      node.self.Node.token.literal === "["
    ) {
      return "arrayAccess";
    }
    if ("language" in node) return "language";
    if ("right" in node && "left" in node && "distinct" in node)
      return "setOperator"; // union all
    if ("right" in node && "left" in node) return "binaryOperator"; // and, join, =
    if ("right" in node && "date_part" in node) return "intervalLiteral";
    if ("right" in node) return "unaryOperator";
    if ("rparen" in node && "expr" in node) return "groupedExpr";
    if ("rparen" in node && "exprs" in node) return "groupedExprs";
    if ("rparen" in node && "stmt" in node) return "groupedStmt"; // (select *)
    if ("then" in node && "stmt" in node) return "whenClause"; // (select *)
    if ("as" in node && "stmt" in node) return "withQuery"; // name as (select *)
    if ("as" in node && "window" in node) return "windowExprs"; // name as (partition by col1)
    if ("queries" in node) return "withQueries"; // name as (select *)
    if ("rparen" in node) return "windowSpecification"; // (parttion by col1 order by col2)
    if ("arms" in node) return "caseExpr";
    if ("type_declaration" in node) return "structOrArrayType"; // struct<int64>
    if ("result" in node) return "caseArm";
    if ("unnest_offset" in node) return "withOffset"; // with offset
    if ("offset" in node) return "limitClause";
    if ("window" in node) return "overClause";
    if ("for_system_time_as_of" in node || "tablesample" in node)
      return "tableName";
    if ("system_time_as_of" in node) return "forSystemTimeAsOfClause";
    if ("by" in node && "expr" in node) return "xxxByExpr";
    if ("by" in node && "exprs" in node) return "xxxByExprs";
    if ("options" in node || "not_null" in node) return "schema";
    if ("expr" in node) return "keywordWithExpr";
    if ("exprs" in node) return "keywordWithExprs";
    if ("stmts" in node) return "keywordWithStmts";
    if ("stmt" in node) return "keywordWithStmt";
  }
  return ""; // default
};

module.exports = printSQL;
