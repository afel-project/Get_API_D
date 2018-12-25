# Get_API_D
Get API for Didactalia App

This is the API called by the AFEL Didactalia application to display user data.
It is made of two nodeJS scripts:
   - DidactaliaGetAPI creates a server to return the latest data related to access to educational resources on Didactalia (port 8202)
   - DidactaliaGameAPI creates a server to return the latest data about the use of games (port 8073)
   
There are a few dependencies to consider which should be easy to install using npm.

Those scripts assume that ElasticSearch server is located at localhost:9200 but this is easy to change.

