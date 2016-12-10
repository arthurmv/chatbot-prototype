const _ = require( "underscore" );

module.exports = {

    // the initial state that all conversations begin in.
    // the user instigates conversations and thus this is the *only* state *without* a question
    init : {
        question : null,
        interpreter : (a,r) => { r.state = "ask_name"; r.reply = "Hey there!"; }
    },

    ask_name : {
        question : () => "What's your name?",
        interpreter : function( answer, res ) {
            res.data.name = answer;
            res.state = "ask_feeling";
            res.reply = `Well its nice to meet you, ${answer}!`;
        }
    },

    ask_feeling : {
        question : (data) => `${data.name}, tell me in a few words how you're feeling..`,
        interpreter : function( answer, res ) {
            const wordBag = [ "sad", "lonely", "tired", "scared", "suicidal" ];
            // do your "bag of words" analysis here..
            var foundWords = answer.split( " " ).intersection( wordBag );
            if( _.contains( foundWords, "suicidal" ) ) {
                res.reply = "Before you do anything, please call 999 and talk to someone";
                res.finished = true;
            } else {
                res.state = "ask_occupation";
                res.reply = "Ah geez, I'm very sorry to hear that";
            }
        }
    },

    ask_occupation : {
        question : () => "Can you tell me what you do?",
        interpreter : function( answer, res ) {
            const wordBag = [ "student", "job", "finance" ];
            var foundWords = answer.split( " " ).intersection( wordBag );
            if( _.contains( foundWords, "student" ) ) {
                res.reply = "Get in touch with your tutor! They're a great resource";
                res.state = null;
            } else {
                res.reply = "Speak to a shrink!";
                res.state = null;
            }
        }
    }

};
