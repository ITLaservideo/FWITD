CREATE TABLE TS_Jobs (
    Id          NVARCHAR(8)    NOT NULL,
    Name        NVARCHAR(200)  NOT NULL,
    Description NVARCHAR(MAX)  NULL,
    ActionName  NVARCHAR(100)  NULL,
    Status      NVARCHAR(20)   NOT NULL CONSTRAINT DF_TS_Jobs_Status    DEFAULT 'Pending',
    Progress    INT            NOT NULL CONSTRAINT DF_TS_Jobs_Progress  DEFAULT 0,
    CreatedAt   DATETIME2      NOT NULL,
    ScheduledAt DATETIME2      NULL,
    StartedAt   DATETIME2      NULL,
    CompletedAt DATETIME2      NULL,
    Error       NVARCHAR(2000) NULL,
    Result      NVARCHAR(MAX)  NULL,
    CONSTRAINT PK_TS_Jobs PRIMARY KEY (Id)
);
