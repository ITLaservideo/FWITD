CREATE TABLE Auth_ListHardCodedActions(
    [ActionID] int PRIMARY KEY NOT NULL,
    [ActionName] varchar(255) NOT NULL
);
--#split-sql-batch#--
CREATE TABLE Auth_UserTypeAllowedActions (
    [ID] INT PRIMARY KEY IDENTITY,
    [UserType] INT NOT NULL,
    [ActionID] INT NOT NULL,
    CONSTRAINT UC_UserType_ActionID UNIQUE (UserType, ActionID),
    FOREIGN KEY (ActionID) REFERENCES Auth_ListHardCodedActions(ActionID)
);
--#split-sql-batch#--
INSERT INTO
    [Auth_ListHardCodedActions] ([ActionID], [ActionName])
VALUES
    (0, 'ANY :: Funzionalità minime.'),
    (1, 'USER :: Utente base, funzionalità per i clienti base.'),
    (2, 'NEXT_USER :: Utente sperimentale, funzionalità per i clienti che vogliono provare l''ultima novità.'),
    (3, 'Pro :: funzionalità per operatori e supporto.'),
    (-999, 'Full control.');
--#split-sql-batch#--    
-- greater the number, greater the power, users can create new users with lower privileges no -999
INSERT INTO [Auth_UserTypeAllowedActions] ([UserType], [ActionID])
VALUES 
(-999, -999),  -- UserType -999 + action ID -999 //Full control [always grants all actions]
(1, 0),		-- UserType 1 + action ID 0	//Funzionalità minime [optional, always granted 0]
(2, 1),		-- UserType 2 + action ID 1	//Utente Base   [grant 0,1]
(3, 1),		-- UserType 3 + action ID 1	//Utente Base           [grant actions 0,1,2]
(3, 2),		-- UserType 3 + action ID 2	//Utente sperimentale   [grant actions 0,1,2]
(4, 3);		-- UserType 4 + action ID 3	//Pro   [grant actions 0,3]