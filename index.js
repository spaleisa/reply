var rl, readline = require('readline'); /** Allows the user to type in input when asked a question. */

/** Creates the interface and if it already exists, it just resumes the interface. 
 * @param stdin
 * @param stdout
 * @returns rl
*/
var get_interface = function(stdin, stdout) {
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
}

/** Sets up a message/question with a default answer of "yes" and then sets up a yes/no question to prompt the user with. 
 * @param {String} message
 * @param {Function} callback
*/
var confirm = exports.confirm = function(message, callback) {

  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes'
    }
  }

 /** Gets a yes/no question from the user. If no question is asked, an error will appear. */
  get(question, function(err, answer) {
    if (err) return callback(err);
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

/** Sets up the question system by prompting the user, checking to see if their answer is valid, and continues to ask questions until there are no more. Also allows the program to close if necessary.
 * @param options
 * @param callback
 * @returns {} if you do not want to callback || call on callback function
 */
var get = exports.get = function(options, callback) {

  if (!callback) return; // no point in continuing

  if (typeof options != 'object')
    return callback(new Error("Please pass a valid options object."))

  var answers = {},
      stdin = process.stdin,
      stdout = process.stdout,
      fields = Object.keys(options);

  /** Calls close_prompt and then calls callback to get answers given by user. */
  var done = function() {
    close_prompt();
    callback(null, answers);
  }

  /** Pauses input scanner and checks if rl is null. Closes the readline if it is null and the questions are done.
   * @returns {} if rl is not null
  */
  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  }

  /** checks the options.json and sees if the question reference is an object. If it is, gets the default answer for it.
   * @param key
   * @param partial_answers
   * @returns default values if they exist. 
  */
  var get_default = function(key, partial_answers) {
    if (typeof options[key] == 'object')
      // Checks if default call is function and if it is, then do default of partial_answers and if not, just do default (could be null).
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
    else
      return options[key];
  }

  /** Checks the users reply to see if it is empty, "yes", "no", or it just returns their reply. 
   * @param reply
   * @returns {Boolean} {Integer} {String}
  */
  var guess_type = function(reply) {

    if (reply.trim() == '')
      return;
    else if (reply.match(/^(true|y(es)?)$/))
      return true;
    else if (reply.match(/^(false|n(o)?)$/))
      return false;
    else if ((reply*1).toString() === reply)
      return reply*1;

    return reply;
  }

  /** Validating the answer that the user typed in.
   * @param key
   * @param answer
   * @returns {Boolean}
  */
  var validate = function(key, answer) {

    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;

  }

  /** Shows error message "Invalid value" when an improper input is given. Shows options if there are any.
   * @param key
  */
  var show_error = function(key) {
    var str = options[key].error ? options[key].error : 'Invalid value.';

    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';

    stdout.write("\033[31m" + str + "\033[0m" + "\n");
  }

  /** Shows question from the program and also shows options if they exist. 
   * @param key
  */
  var show_message = function(key) {
    var msg = '';

    if (text = options[key].message)
      msg += text.trim() + ' ';

    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';

    if (msg != '') stdout.write("\033[1m" + msg + "\033[0m\n");
  }

  // taken from commander lib
  /** User inputs a password and it is masked with '*' so that it is hidden.
   * @param prompt
   * @param callback
   */
  var wait_for_password = function(prompt, callback) {

    var buf = '',
        mask = '*';
    
    /** Looks for the user to press enter and removes the password if they did. 
     * Sets up control + c to close prompt
     * Deals with a user backspacing their password letters. Also builds up password. 
     */
    var keypress_callback = function(c, key) {
         
      if (key && (key.name == 'enter' || key.name == 'return')) {
        stdout.write("\n");
        stdin.removeAllListeners('keypress');
        // stdin.setRawMode(false);
        return callback(buf);
      }

      if (key && key.ctrl && key.name == 'c')
        close_prompt();

      if (key && key.name == 'backspace') {
        buf = buf.substr(0, buf.length-1);
        var masked = '';
        for (i = 0; i < buf.length; i++) { masked += mask; }
        stdout.write('\r\033[2K' + prompt + masked);
      } else {
        stdout.write(mask);
        buf += c;
      }

    };

    stdin.on('keypress', keypress_callback);
  }

  /** Gets the users answer (whether it is what they typed or the default) and validates the answer. Goes to next question if it is valid or repeats the question and shows error.
   * @param index
   * @param curr_key
   * @param fallback
   * @param reply
  */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply); //datatype
    var return_answer = (typeof answer != 'undefined') ? answer : fallback;

    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer);
    else
      show_error(curr_key) || next_question(index); // repeats current
  }

  /** Make sure all dependencies are met if there is a specific answer for the question (depends_on). 
   * @param conds
   * @returns {Boolean}
   */ 
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }

    return true;
  }

  /** Checks to see if the answers are equal and then prompts the options for the question. Shows the default answer if there is one and displays the question. Checks to see if the question is a password and may go on to the next question if the password is proper, or if the last question is answered it automatically goes to the next question. 
   * @param index
   * @param prev_key
   * @param answer
   * @returns done() || next_question call
  */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done();

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined);
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers);
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] ";

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  }

  rl = get_interface(stdin, stdout);
  next_question(0);

  /** Closes the readline 
   * @return {}
  */
  rl.on('close', function() {
    close_prompt(); // just in case

    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return;

    var err = new Error("Cancelled after giving " + given_answers + " answers.");
    callback(err, answers);
  });

}
