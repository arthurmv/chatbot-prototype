DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE conversation (
    id SERIAL,
    stage TEXT NULL,
    data TEXT,
    lastUpdate TIMESTAMP,
    PRIMARY KEY( id )
);

CREATE TABLE sms (
    id TEXT, -- actually the mobile number
    conversationId INT,
    PRIMARY KEY( id ),
    FOREIGN KEY( conversationId ) REFERENCES conversation( id )
);

CREATE TABLE web (
    id TEXT, -- for security purposes this will be an UUID
    conversationId INT,
    PRIMARY KEY( id ),
    FOREIGN KEY( conversationId ) REFERENCES conversation( id )
);

ALTER SCHEMA public OWNER TO dbuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dbuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dbuser;
