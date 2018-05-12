// asynchronous self-invoking function to not pollute global namespace
(function() {
  const TAB_KEY_CODE = 9;
  const M_KEY_CODE = 77;

  const SOFT_TAB = '    ';
  const SOFT_TAB_LENGTH = SOFT_TAB.length;

  const ONLY_WHITESPACE_REGEX = /^\s*$/;
  const WHITESPACE_SPLIT_REGEX = /\s+$/g;

  /* Throttle the given function, condensing multiple calls into one call after
   * the given timeout period. In other words, allow at most one call to go
   * through per timeout period. Returns the throttled function.
   *
   * Arguments:
   * fn -- the function to throttle
   * timeout -- the timeout to throttle for
   */
  function throttle(fn, timeout) {
    return function throttledFn(...args) {
      if (!throttledFn.timer) {
        // call the function after the provided timeout
        throttledFn.timer = setTimeout(() => {
          fn(...args);

          // finished calling the function; unset the timer
          throttledFn.timer = undefined;
        }, timeout);
      }
    };
  }

  window.addEventListener('DOMContentLoaded', event => {
    let key = 'mystyle_' + window.location.hostname;
    chrome.storage.sync.get(key, my_css => {
      console.log(JSON.stringify(my_css));

      let head = document.getElementsByTagName('head')[0];
      let body = document.body;

      let style = document.createElement('style');
      let textarea = document.createElement('textarea');

      // hide textarea by default
      textarea.style.display = 'none';
      textarea.id = 'my-style-input';
      textarea.spellcheck = false;

      head.appendChild(style);
      body.appendChild(textarea);

      style.innerHTML = my_css[key] || localStorage.myStyle || '';
      textarea.value = style.innerHTML;
      textarea.placeholder = '/* Enter your styles here. */';

      // alt + click on an element adds its selector to the textarea
      body.addEventListener('click', event => {
        // ensure textarea is actually displayed
        if (
          textarea.style.display.indexOf('none') === -1 &&
          event.target.id !== textarea.id &&
          event.altKey
        ) {
          let i = 0;
          let target = event.target;
          let elemClass = target.className.split(' ') || '';
          let stylesList = [];
          let existingStyles = '';
          let selector = '';
          let cssStatement;
          let textToAdd;

          // selector starts with the tag
          selector += target.tagName.toLowerCase();

          // include ID if there is one
          if (target.id) {
            selector += '#' + target.id;
          }

          // include all classes found
          for (i = 0; i < elemClass.length; i++) {
            if (!ONLY_WHITESPACE_REGEX.test(elemClass[i])) {
              selector += '.' + elemClass[i];
            }
          }

          // fill CSS with styles defined in the style attribute
          if (target.getAttribute('style')) {
            stylesList = target.getAttribute('style').split(';');

            // keep track of CSS properties already defined in style attribute
            for (i = 0; i < stylesList.length; i++) {
              // condense mutliple whitespace into one space
              cssStatement = stylesList[i]
                .split(WHITESPACE_SPLIT_REGEX)
                .join(' ')
                .trim();

              if (!ONLY_WHITESPACE_REGEX.test(cssStatement)) {
                existingStyles += SOFT_TAB + cssStatement.toLowerCase() + ';\n';
              }
            }
          }

          // construct text to add to textarea
          if (selector) {
            // add existing styles in braces
            if (existingStyles) {
              existingStyles = '{\n' + existingStyles + '}';
            } else {
              existingStyles = '{\n\n}';
            }

            textToAdd = '\n' + selector + ' ' + existingStyles;
            textarea.value += textToAdd;

            // highlight added text for easy removal
            textarea.focus();
            textarea.setSelectionRange(
              textarea.value.length - textToAdd.length,
              textarea.value.length
            );
          }

          event.preventDefault();
        }
      });

      /* Save styles persistently in local storage. */
      let saveStyles = throttle(() => {
        localStorage.myStyle = style.innerHTML;
        let key = 'mystyle_' + window.location.hostname;
        let obj = {};
        obj[key] = style.innerHTML;
        chrome.storage.sync.set(obj);
      }, 500);

      /* Updates styles with content in textarea and saves styles. */
      function updateAndSaveStyles() {
        style.innerHTML = textarea.value;
        saveStyles();
      }

      // continually update styles with textarea content
      textarea.addEventListener('keyup', updateAndSaveStyles);
      textarea.addEventListener('change', updateAndSaveStyles);

      // pressing tab should insert spaces instead of focusing another element
      textarea.addEventListener('keydown', event => {
        let value = textarea.value;
        let caret = textarea.selectionStart;

        // if tab is pressed, insert four spaces
        if (event.keyCode === TAB_KEY_CODE) {
          textarea.value =
            value.substring(0, caret) + SOFT_TAB + value.substring(caret);

          // move caret to after soft tab
          textarea.setSelectionRange(
            caret + SOFT_TAB_LENGTH,
            caret + SOFT_TAB_LENGTH
          );

          // prevent default tab action that shifts focus to the next element
          event.preventDefault();
        }
      });

      window.addEventListener('keydown', event => {
        // control + m toggles text area
        if (event.ctrlKey && event.keyCode === M_KEY_CODE) {
          if (textarea.style.display == 'none') {
            textarea.style.display = 'block';
          } else {
            textarea.style.display = 'none';
          }
        }
      });
    });
  });
})();
