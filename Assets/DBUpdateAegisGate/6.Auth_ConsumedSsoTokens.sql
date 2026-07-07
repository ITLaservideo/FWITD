CREATE TABLE Auth_ConsumedSsoTokens (
    [Jti] varchar(64) PRIMARY KEY NOT NULL,
    [ExpiresAtUtc] datetime2 NOT NULL
);
--#split-sql-batch#--
CREATE INDEX IX_Auth_ConsumedSsoTokens_ExpiresAtUtc
    ON Auth_ConsumedSsoTokens (ExpiresAtUtc);
