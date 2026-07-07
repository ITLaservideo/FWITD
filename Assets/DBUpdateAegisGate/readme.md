# DBUpdate

SQL update scripts applied automatically at startup by `SQL.EnsureTablesAndDataExist()`.

## How it works

- Files must be named with a numeric prefix: `1.Description.sql`, `42.AddTable.sql`, etc.
- The current version is stored in `TG_LocalSettings` under the key `db_update_version`.
- At startup, all scripts whose numeric prefix is **greater than** the current version are executed in ascending order.
- After all scripts run, `db_update_version` is updated to the highest applied version.
- To split a single file into multiple SQL batches, separate them with the token:
    ```sql
    --#split-sql-batch#--
    ```
- Errors inside a script are **caught and ignored** — startup is never blocked by a failed migration. Check logs if a script silently fails.

---

# create demo account
password `pwd`
- `base@me.it`
- `exp@me.it`
- `pro@me.it`
```sql
insert into Auth_Users(Email,UserType) values('base@me.it',2);--Base
insert into Auth_Users(Email,UserType) values('exp@me.it',3);--sperimentale
insert into Auth_Users(Email,UserType) values('pro@me.it',4);--Pro

insert into Auth_Credentials(UserID,PasswordHash) select UserID,'3+Z7Nfdrie9FDObar/XJ9g==:TF5GmSBgs44qjy8pGihcjZfUx2dMLqIRKzRAOwZZzw4=' from Auth_Users where Email='base@me.it';
insert into Auth_Credentials(UserID,PasswordHash) select UserID,'3+Z7Nfdrie9FDObar/XJ9g==:TF5GmSBgs44qjy8pGihcjZfUx2dMLqIRKzRAOwZZzw4=' from Auth_Users where Email='exp@me.it';
insert into Auth_Credentials(UserID,PasswordHash) select UserID,'3+Z7Nfdrie9FDObar/XJ9g==:TF5GmSBgs44qjy8pGihcjZfUx2dMLqIRKzRAOwZZzw4=' from Auth_Users where Email='pro@me.it';

insert into User_Profiles(UserID,Description,PhoneNumber) select UserID,'user Base','+39 no' from Auth_Users where Email='base@me.it';
insert into User_Profiles(UserID,Description,PhoneNumber) select UserID,'user sperimentale','+39 no' from Auth_Users where Email='exp@me.it';
insert into User_Profiles(UserID,Description,PhoneNumber) select UserID,'user Pro','+39 no' from Auth_Users where Email='pro@me.it';
```