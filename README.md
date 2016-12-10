Proposed Spec
=============

## Data Model

```sql

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
    FOREIGN KEY( conversation_id ) REFERENCES conversation( id )
);

CREATE TABLE web (
    id GUID -- for security purposes...
    conversation_id INT,
    PRIMARY KEY( id ),
    FOREIGN KEY( conversation_id ) REFERENCES conversation( id )
);

```

## ChatBot Mechanics

Conversations can be conceptualized as state transitions. Each state has:

  1) A question generator, which generates a personalised question based on collected user data (such as name)
  2) An answer interpreter, which takes the user's answer and collected user data and does:
    * an update to the collected user data, adding any additional information learnt in the answer
    * provides a tailored response to the answer to send back to the user
    * selects the next state to transition to

### Specific Interface

The entirety of the state graph can be laid out in a dictionary object. Each entry is a unique state, with its key being a unique identifier.

#### Question Generator

The question generator can be implemented as a simple function that takes in a dictionary of user data, and returns a string question. Below is an example:

```javascript
function dummyQuestion( userData ) {
    var gender = userData.gender === "M" ? "male" : "female";
    return `So ${userData.name}, do you find ` +
        `it tough growing up as a ${gender}?`;
}
```

*Instead of returning a string, you could allow for the option to provide overrides for specific vectors. If the question is multiple choice,
you could send the choices to a web client in a structured form, which in turn could render the question as a set of buttons instead of just text. 
This would reduce the scope for mis-interpreting the answer.*

#### Answer Interpeter

The answer interpreter is slightly more tricky - it can be implemented as a function that takes the raw answer string, and a special `result` object.

The `result` object has the following fields:

  * `state` : set this to the state identifier that you wish to transition to. Set this to `null` to signify completion.
  * `data` : this contains a cloned dictionary of the user's data. Make any revisions/additions to the user data by modifying this.
  * `reply` : set this to be the message that the bot will respond with

Below is a simple example:

```javascript
// interpreter for state "ask_age", with the question - "How old are you?"
function dummyInterpreter( answer, res ) {
    var age = parseInt( answer ); 
    if( age === NaN ) {
        res.reply = "Didn't quite catch that..";
        //transition to the current state to re-ask the question
        res.state = "ask_age" 
    } else {
       res.reply = "Wow, ${age}, you're ancient!"; 
       res.state = "ask_gender";
    }
}
```
