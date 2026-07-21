-- SCHRG INCIDENT METRICS - Reference SQL Queries
-- Database: ediprod.db.corporate.cargowise.com / edidb
-- Auth: Windows Authentication (CORP\Brian.Santoso)

DECLARE @StartDate DATETIME = '2024-09-01';
DECLARE @StaffList NVARCHAR(200) = 'AER,BS8,KLT,RS6';
DECLARE @ExcludePriorities NVARCHAR(200) = 'CR6,FTR';

;WITH Staffs AS (
    SELECT value AS StaffCode FROM STRING_SPLIT(@StaffList, ',')
), ExcludedPriorities AS (
    SELECT value AS Priority FROM STRING_SPLIT(@ExcludePriorities, ',')
)

-- ============================================
-- QUERY 1: YEARLY METRICS
-- Expected: 49 rows
-- ============================================
SELECT
    YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
    WF.P9_GS_NKAssignedStaffMember AS StaffMember,
    IM.IM_Priority AS Priority,
    COUNT(DISTINCT IM.IM_PK) AS IncidentCount,
    ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_ResolveTimeUtc) / 86400.0), 4) AS AvgDaysToClose,
    ROUND(MIN(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_ResolveTimeUtc) / 86400.0), 4) AS MinDays,
    ROUND(MAX(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_ResolveTimeUtc) / 86400.0), 4) AS MaxDays
FROM IncidentMain IM
INNER JOIN (
    SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
    FROM WorkflowTask
    WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
) WF ON IM.IM_PK = WF.P9_ParentID AND WF.rn = 1
WHERE IM.IM_Status = 'CLS'
    AND IM.IM_SystemCreateTimeUtc >= @StartDate
    AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), WF.P9_GS_NKAssignedStaffMember, IM.IM_Priority
ORDER BY Year DESC, StaffMember, Priority;

-- ============================================
-- QUERY 2: MONTHLY METRICS
-- Expected: 80 rows
-- ============================================
SELECT
    YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
    MONTH(IM.IM_SystemCreateTimeUtc) AS Month,
    FORMAT(IM.IM_SystemCreateTimeUtc, 'yyyy-MM') AS YearMonth,
    WF.P9_GS_NKAssignedStaffMember AS StaffMember,
    COUNT(DISTINCT IM.IM_PK) AS IncidentCount,
    ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_ResolveTimeUtc) / 86400.0), 4) AS AvgDaysToClose
FROM IncidentMain IM
INNER JOIN (
    SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
    FROM WorkflowTask
    WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
) WF ON IM.IM_PK = WF.P9_ParentID AND WF.rn = 1
WHERE IM.IM_Status = 'CLS'
    AND IM.IM_SystemCreateTimeUtc >= @StartDate
    AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), MONTH(IM.IM_SystemCreateTimeUtc), FORMAT(IM.IM_SystemCreateTimeUtc, 'yyyy-MM'), WF.P9_GS_NKAssignedStaffMember
ORDER BY Year DESC, Month DESC, StaffMember;

-- ============================================
-- QUERY 3: YEAR-OVER-YEAR COMPARISON
-- Expected: 11 rows
-- ============================================
;WITH YearlyStats AS (
    SELECT
        YEAR(IM.IM_SystemCreateTimeUtc) AS Year,
        WF.P9_GS_NKAssignedStaffMember AS StaffMember,
        ROUND(AVG(DATEDIFF(SECOND, IM.IM_SystemCreateTimeUtc, IM.IM_ResolveTimeUtc) / 86400.0), 4) AS AvgDays,
        COUNT(DISTINCT IM.IM_PK) AS IncidentCount
    FROM IncidentMain IM
    INNER JOIN (
        SELECT P9_ParentID, P9_GS_NKAssignedStaffMember, ROW_NUMBER() OVER (PARTITION BY P9_ParentID ORDER BY P9_PK DESC) AS rn
        FROM WorkflowTask
        WHERE P9_ParentTableCode = 'IM' AND P9_GS_NKAssignedStaffMember IN (SELECT StaffCode FROM Staffs)
    ) WF ON IM.IM_PK = WF.P9_ParentID AND WF.rn = 1
    WHERE IM.IM_Status = 'CLS'
        AND IM.IM_SystemCreateTimeUtc >= @StartDate
        AND IM.IM_Priority NOT IN (SELECT Priority FROM ExcludedPriorities)
    GROUP BY YEAR(IM.IM_SystemCreateTimeUtc), WF.P9_GS_NKAssignedStaffMember
)
SELECT
    Curr.Year AS CurrentYear,
    Curr.StaffMember,
    Curr.AvgDays AS CurrentAvgDays,
    Curr.IncidentCount AS CurrentCount,
    Prv.AvgDays AS PriorAvgDays,
    Prv.IncidentCount AS PriorCount,
    ROUND(((Prv.AvgDays - Curr.AvgDays) / NULLIF(Prv.AvgDays, 0) * 100), 2) AS ImprovementPercent
FROM YearlyStats Curr
LEFT JOIN YearlyStats Prv ON Curr.StaffMember = Prv.StaffMember AND Curr.Year = Prv.Year + 1
ORDER BY CurrentYear DESC, StaffMember;
