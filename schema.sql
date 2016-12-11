DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE conversation (
    id SERIAL,
    state TEXT,
    data JSON,
    last_update TIMESTAMP,
    PRIMARY KEY( id )
);

CREATE TABLE sms (
    id TEXT, -- actually the mobile number
    conversation_id INT,
    PRIMARY KEY( id ),
    FOREIGN KEY( conversation_id ) REFERENCES conversation( id )
);

CREATE TABLE web (
    id TEXT, -- for security purposes this will be an UUID
    conversation_id INT,
    PRIMARY KEY( id ),
    FOREIGN KEY( conversation_id ) REFERENCES conversation( id )
);

ALTER SCHEMA public OWNER TO dbuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dbuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dbuser;
