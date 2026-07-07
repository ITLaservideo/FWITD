CREATE TABLE Auth_Users (
    [UserID] bigint PRIMARY KEY NOT NULL IDENTITY,
    [Email] varchar(255) UNIQUE NOT NULL,
    [UserType] int NOT NULL,
    [Disabled] bit NOT NULL DEFAULT 0
);
--#split-sql-batch#--
CREATE TABLE Auth_Credentials (
    [UserID] bigint PRIMARY KEY NOT NULL
        REFERENCES Auth_Users([UserID]),
    [PasswordHash] varchar(128) NOT NULL,
    [PasswordChangedAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
--#split-sql-batch#--
CREATE TABLE User_Profiles (
    [UserID] bigint PRIMARY KEY NOT NULL
        REFERENCES Auth_Users([UserID]),
    [Description] varchar(255) NOT NULL,
    [PhoneNumber] varchar(50) NOT NULL
);
--#split-sql-batch#--
CREATE TABLE User_Devices (
    [DeviceID] bigint PRIMARY KEY NOT NULL IDENTITY,
    [UserID] bigint NOT NULL REFERENCES Auth_Users([UserID]),
    [FCMDeviceID] varchar(150) NOT NULL,
    [LastSeenAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
