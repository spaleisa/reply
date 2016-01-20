var reply = require('reply');

reply.confirm('Do you like chocolate cake?', function(error, yes) {
  var answer = (!error && yes) ? "Then we can be friends!" : 'Well that is a serious shame.';
  console.log(answer);
});