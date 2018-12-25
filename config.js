

var config = {
//    index: "didactalia"
    index: "didactalia-activity-base",
    game_index: "didactalia-activity-game",
    csvfields: [
	"user",
	"resource", 
	"title",	
	"tags",
	"scope",
	"type",
	"tool",
	"Year",
	"Month",
	"Day",
	"Hour",
	"Minutes",
	"Seconds",
	"Day of Week",
	"date",
	"coverage",
	"diversity",
	"complexity"
    ],
    minsupport: 3,
    minlevel: 1,
    maxdiff: 0.8, // not used?
    defaultsize: 1000,
    minncluster: 6, // not used?
    wc: 0.0, wd: 0.0, wi: .50, ws: 1.0
};
module.exports =  config
