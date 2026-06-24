CREATE TABLE Auth_Users (
    [UserID] bigint PRIMARY KEY NOT NULL IDENTITY,
    [Email] varchar(255) UNIQUE NOT NULL,
    [Password] varchar(128) NOT NULL,
    [UserType] int NOT NULL,
    [Description] varchar(255) NOT NULL,
    [PhoneNumber] varchar(50) NOT NULL,
    [Disabled] bit,
    [FCMDeviceID] varchar(150)
);
