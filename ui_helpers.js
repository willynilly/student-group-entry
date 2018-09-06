exports.onEnter = function($, selector, callback) {
  $(selector).on('keypress', function (e) {
       if(e.which === 13){
          //Disable textbox to prevent multiple submit
          $(this).attr("disabled", "disabled");
          //Do Stuff, submit, etc..
          callback()
          //Enable the textbox again if needed.
          $(this).removeAttr("disabled");
       }
 });
}

exports.onTextChange = function($, selector, callback) {
  $(selector).on('change keyup paste', function (e) {
        callback();
  });
}
