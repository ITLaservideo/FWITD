CREATE TABLE dbo.GD_ExceptionLog (
    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    LoggedAt DATETIME2(3) NOT NULL 
        CONSTRAINT DF_GD_ExceptionLog_LoggedAt DEFAULT (SYSUTCDATETIME()),
    ExceptionMessage NVARCHAR(2000) NOT NULL,
    StackTrace NVARCHAR(MAX) NULL
);
--#split-sql-batch#--
CREATE INDEX IX_GD_ExceptionLog_LoggedAt
    ON dbo.GD_ExceptionLog (LoggedAt DESC);
