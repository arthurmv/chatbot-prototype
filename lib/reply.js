const _ = require( "underscore" );
const model = require( "./model" );
const states = require( "./states" );

function getQuestion( conv ) {
    return states[ conv.state ].question( conv.data );
}

function getReply( conv, answer ) {
    var resultObj = {
        state : conv.state,
        data  : _.clone( conv.data ),
        reply : null
    };
    states[ conv.state ].interpreter( answer, resultObj );
    return resultObj;
}

async function respondToAnswer( conv, answer ) {
    var ans = getReply( conv, answer );
    _.extend( conv, { data: ans.data, state : ans.state } );
    await model.conversation.put( conv );
    var nextQuestion = getQuestion( conv );
    if( nextQuestion !== null )
        ans.reply += " " + nextQuestion;
    return ans.reply;
}


module.exports = respondToAnswer;
