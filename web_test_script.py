# test the chatbot is working correctly by sending some http requests

import requests

class Conversation:
    def __init__( self, url ):
        self.url = url
    def respond( self, answer ):
        print "Answer: " + answer
        resp = requests.put( self.url, json = dict( answer = answer ) )
        print "Reply: " + resp.json()["reply"]

def new_conversation():
    base_url = "http://www.chatbot-prototype.devlop/api/web"
    resp = requests.post( base_url, json = dict( answer = "Yo" ) ).json()
    print "Initial Message: " + resp["reply"]
    return Conversation( base_url + "/" + resp["id"] )

convo = new_conversation()
convo.respond( "Edmund" )
convo.respond( "Cheese Balls" )
convo.respond( "8" )

convo = new_conversation()
convo.respond( "Mike Rotch" )
convo.respond( "50" )

convo = new_conversation()
convo.respond( "Ed" )
convo.respond( "16" )
convo.respond( "physics" )

convo = new_conversation()
convo.respond( "Tim" )
convo.respond( "15" )
convo.respond( "maths" )
