var reply = require('reply');
 
var noPlayAgain = function(){
  console.log("Ok, maybe next time.");
}

var opts = {
  state: {
    message: 'What state are you from',
    options: ['Washington', 'Idaho', 'Oregon', 'California', 'Utah']
  },
  washington_question: {
    message: 'What town are you from?',
    depends_on: {
      state: 'Washington' 
    }
  },
  not_washington_question: {
    message: 'Oh that is cool. Would you like to leave this conversation?',
    depends_on: {
      state: {not: 'Washington'} 
    },
    default: true
  },
  from_washington: {
    message: 'I am from Yakima! Nice to meet you.',
    depends_on: {
      state: 'Washington' 
    }
  },
  leave_convo: {
    message: 'Would you like to leave this conversation',
    type: 'boolean',
    default: true
  }
}

function start() {
  reply.get(opts, function(err, result){
    if (err || !result.try_again)
      noPlayAgain();
    else
      start();
  })
}

start();
