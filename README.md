Chatbot Prototype
=============

## Uage

Setup is straightforward:

  1. clone the repository
  2. run `npm install`
  3. create a `deploy.json` file that contains the following keys:
    1. `hostname` - the target domain
    2. `logLevel` - the minimum log level to display (`info` or `debug` usually)
    3. `db` - the postgresql db connection string. I.e. `postgres://user:pwd@host:port/db` (schem can be found in `schema.sql`)
    4. `port` - set this to 80
    5. `secure` - set this to `false`
  4. build the project by doing `node build.js`
  5. run the project by doing `node dist/app.js` - you'll have to do this as sudo to bind to port `80`

## ChatBot Mechanics

Conversations can be conceptualized as state transitions. Each state has:

  1. A question generator, which generates a personalised question based on collected user data (such as name)
  2. An answer interpreter, which takes the user's answer and collected user data and does:
    * an update to the collected user data, adding any additional information learnt in the answer
    * provides a tailored response to the answer to send back to the user
    * selects the next state to transition to

### Specific Interface

The entirety of the state graph can be laid out in a dictionary object. Each entry is a unique state, with its key being a unique identifier. The start state has reserved identifier: `init`.

#### Question Generator

The question generator can be implemented as a simple function that takes in a dictionary of user data, and returns a string question. Below is an example:

```javascript
function dummyQuestion( userData ) {
    var gender = userData.gender === "M" ? "male" : "female";
    return `So ${userData.name}, do you find ` +
        `it tough growing up as a ${gender}?`;
}
```

If there is no question to ask (i.e. you are in a special start or end state), the generator should return `null`.

*Instead of returning a string, you could allow for the option to provide overrides for specific vectors. If the question is multiple choice,
you could send the choices to a web client in a structured form, which in turn could render the question as a set of buttons instead of just text. 
This would reduce the scope for mis-interpreting the answer.*

#### Answer Interpeter

The answer interpreter is slightly more tricky - it can be implemented as a function that takes the raw answer string, and a special `result` object.

The `result` object has the following fields:

  * `state` : set this to the state identifier that you wish to transition to.
  * `data` : this contains a cloned dictionary of the user's data. Make any revisions/additions to the user data by modifying this.
  * `reply` : set this to be the message that the bot will respond with (if a response is warranted)

Below is a simple example:

```javascript
// interpreter for state "ask_age", with the question - "How old are you?"
function dummyInterpreter( answer, res ) {
    var age = parseInt( answer ); 
    if( _.isNaN(age) ) {
        res.reply = "Didn't quite catch that..";
        //transition to the current state to re-ask the question
        res.state = "ask_age" 
    } else {
       res.reply = "Wow, ${age}, you're ancient!"; 
       res.data.age = age;
       res.state = "ask_gender";
    }
}
```
