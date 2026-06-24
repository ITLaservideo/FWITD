CREATE TABLE Auth_UserSessions (
    SessionId NVARCHAR(88) NOT NULL,
    UserId bigint NOT NULL,
    DeviceId UNIQUEIDENTIFIER NOT NULL,
    DeviceDescription NVARCHAR(200) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ExpiresAt DATETIMEOFFSET NOT NULL,
    LastAccessedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    IpAddress NVARCHAR(45) NULL,
    CONSTRAINT PK_UserSessions PRIMARY KEY (SessionId),
    CONSTRAINT FK_UserSessions_Users FOREIGN KEY (UserId) REFERENCES Auth_Users(UserID) ON DELETE CASCADE
);
CREATE INDEX IX_UserSessions_UserId ON Auth_UserSessions(UserId);
CREATE INDEX IX_UserSessions_ExpiresAt ON Auth_UserSessions(ExpiresAt);
--#split-sql-batch#--
CREATE TRIGGER TR_UserSessions_OnePerUser ON Auth_UserSessions INSTEAD OF
INSERT AS BEGIN
SET NOCOUNT ON;
DELETE S
FROM Auth_UserSessions S
    JOIN inserted I ON S.UserId = I.UserId;
INSERT INTO Auth_UserSessions (
        SessionId,
        UserId,
        DeviceId,
        DeviceDescription,
        CreatedAt,
        ExpiresAt,
        LastAccessedAt,
        IpAddress
    )
SELECT SessionId,
    UserId,
    DeviceId,
    DeviceDescription,
    CreatedAt,
    ExpiresAt,
    LastAccessedAt,
    IpAddress
FROM inserted;
END;
--#split-sql-batch#--
CREATE PROCEDURE Auth_UserSessions_Create (
    @SessionId NVARCHAR(88),
    @UserId BIGINT,
    @DeviceId UNIQUEIDENTIFIER,
    @DeviceDescription NVARCHAR(200) = NULL,
    @ExpiresAt DATETIMEOFFSET,
    @IpAddress NVARCHAR(45) = NULL
) AS BEGIN
SET NOCOUNT ON;
INSERT INTO Auth_UserSessions (
        SessionId,
        UserId,
        DeviceId,
        DeviceDescription,
        ExpiresAt,
        IpAddress
    )
VALUES (
        @SessionId,
        @UserId,
        @DeviceId,
        @DeviceDescription,
        @ExpiresAt,
        @IpAddress
    );
END;
--#split-sql-batch#--
CREATE PROCEDURE Auth_UserSessions_DeleteExpired AS BEGIN
SET NOCOUNT ON;
DELETE FROM Auth_UserSessions
WHERE ExpiresAt < SYSDATETIMEOFFSET();
END;
--#split-sql-batch#--
CREATE PROCEDURE Auth_UserSessions_Delete @UserId INT,
@DeviceId UNIQUEIDENTIFIER AS BEGIN
SET NOCOUNT ON;
DELETE FROM Auth_UserSessions
WHERE UserId = @UserId
    AND DeviceId = @DeviceId;
END;