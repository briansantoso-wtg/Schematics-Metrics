-- Work Items Query using WorkItemTypeTree hierarchy
-- Product → ProductArea → Module → ChangeType

DECLARE @x XML = (
  SELECT CONVERT(XML, CONVERT(NVARCHAR(MAX), sd_binaryvalue))
  FROM stmdata
  WHERE SD_NAME = 'WorkItemTypeTree'
);

DECLARE @nodes TABLE (
  Code VARCHAR(3),
  Descr VARCHAR(256),
  Bool CHAR(1),
  PK UNIQUEIDENTIFIER,
  ParentID UNIQUEIDENTIFIER
);

INSERT INTO @nodes (Code, Descr, Bool, PK, ParentID)
SELECT
  Code = tree.item.value('Code[1]', 'VARCHAR(3)'),
  Descr = tree.item.value('Description[1]', 'VARCHAR(256)'),
  Bool = tree.item.value('Bool[1]', 'CHAR(1)'),
  PK = tree.item.value('PK[1]', 'UNIQUEIDENTIFIER'),
  ParentID = tree.item.value('ParentID[1]', 'UNIQUEIDENTIFIER')
FROM @x.nodes('ArrayOfCodeDescriptionBoolTreeNode/CodeDescriptionBoolTreeNode') tree(item);

WITH FlatTree AS (
  SELECT Code, Descr, Bool, PK,
    ProductCode = CONVERT(VARCHAR(3), NULL),
    AreaCode = CONVERT(VARCHAR(3), NULL),
    ModuleCode = CONVERT(VARCHAR(3), NULL),
    ChangeTypeCode = CONVERT(VARCHAR(3), NULL),
    Depth = 1
  FROM @nodes
  WHERE ParentId = '00000000-0000-0000-0000-000000000000'

  UNION ALL

  SELECT t.Code, t.Descr, t.Bool, t.PK,
    ProductCode = COALESCE(p.ProductCode, p.Code),
    AreaCode = CASE WHEN p.ProductCode IS NULL THEN NULL ELSE ISNULL(p.AreaCode, p.Code) END,
    ModuleCode = CASE WHEN p.AreaCode IS NULL THEN NULL ELSE ISNULL(p.ModuleCode, p.Code) END,
    ChangeTypeCode = CASE WHEN p.ModuleCode IS NULL THEN NULL ELSE ISNULL(p.ChangeTypeCode, p.Code) END,
    p.Depth + 1
  FROM @nodes t
  INNER JOIN FlatTree p ON t.ParentID = p.PK
  WHERE t.ParentID != '00000000-0000-0000-0000-000000000000'
)

-- Query 1: Work Items with Product=PRO, ProductArea=PRO, Module=SSC, ChangeType=TMC
SELECT
  WKI_PK,
  WKI_WorkItemNumber,
  WKI_WorkItemType AS ProductCode,
  WKI_WorkItemArea AS AreaCode,
  WKI_ActivityType AS ModuleCode,
  WKI_ActivitySubtype AS ChangeTypeCode,
  Tree.Descr AS ChangeTypeDescription,
  WKI_Summary,
  WKI_Status,
  WKI_Priority,
  WKI_SystemCreateTimeUtc,
  WKI_SystemLastEditTimeUtc,
  WKI_SystemCreateUser
FROM dbo.WorkItem WKI
LEFT JOIN FlatTree Tree ON
  WKI_WorkItemType = Tree.ProductCode
  AND WKI_WorkItemArea = Tree.AreaCode
  AND WKI_ActivityType = Tree.ModuleCode
  AND WKI_ActivitySubtype = Tree.ChangeTypeCode
WHERE
  WKI_WorkItemType = 'PRO'
  AND WKI_WorkItemArea = 'PRO'
  AND WKI_ActivityType = 'SSC'
  AND WKI_ActivitySubtype = 'TMC'
ORDER BY WKI_SystemCreateTimeUtc DESC;

-- Query 2: Work Items with Product=PRO, ProductArea=PRO, Module=SSC, ChangeType != TMC
SELECT
  WKI_PK,
  WKI_WorkItemNumber,
  WKI_WorkItemType AS ProductCode,
  WKI_WorkItemArea AS AreaCode,
  WKI_ActivityType AS ModuleCode,
  WKI_ActivitySubtype AS ChangeTypeCode,
  Tree.Descr AS ChangeTypeDescription,
  WKI_Summary,
  WKI_Status,
  WKI_Priority,
  WKI_SystemCreateTimeUtc,
  WKI_SystemLastEditTimeUtc,
  WKI_SystemCreateUser
FROM dbo.WorkItem WKI
LEFT JOIN FlatTree Tree ON
  WKI_WorkItemType = Tree.ProductCode
  AND WKI_WorkItemArea = Tree.AreaCode
  AND WKI_ActivityType = Tree.ModuleCode
  AND WKI_ActivitySubtype = Tree.ChangeTypeCode
WHERE
  WKI_WorkItemType = 'PRO'
  AND WKI_WorkItemArea = 'PRO'
  AND WKI_ActivityType = 'SSC'
  AND WKI_ActivitySubtype != 'TMC'
ORDER BY WKI_SystemCreateTimeUtc DESC;
