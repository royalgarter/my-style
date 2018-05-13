// asynchronous self-invoking function to not pollute global namespace
(function() {
  const TAB_KEY_CODE = 9;
  const M_KEY_CODE = 77;

  const SOFT_TAB = '    ';
  const SOFT_TAB_LENGTH = SOFT_TAB.length;

  const STORAGE_KEY = 'mystyle_' + window.location.hostname;

  /**
   * Throttle the given function, condensing multiple calls into one call after
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

  function loadStyles(key /*: string */ = STORAGE_KEY) /*: Promise<string> */ {
    if (!loadStyles.cached) {
      loadStyles.cached = new Promise(resolve => {
        chrome.storage.sync.get(key, result => {
          resolve(result[key] || '');
        });
      });
    }

    return loadStyles.cached;
  }

  /**
   * Save styles persistently in local storage.
   */
  function saveStyles(css /*: string */, key /*: string */ = STORAGE_KEY) {
    if (!saveStyles.throttledFn) {
      saveStyles.throttledFn = throttle(css => {
        chrome.storage.sync.set({ [key]: css });
      }, 500);
    }

    saveStyles.throttledFn(css);
  }

  function applyStyles(css /*: string */ = '') {
    if (!applyStyles.$style) {
      let $style = document.createElement('style');
      document.head.appendChild($style);
      applyStyles.$style = $style;
    }

    applyStyles.$style.innerHTML = css;
  }

  /**
   * Get element selector as tag#id.class1.class2
   */
  function generateCSSSelector(element /*: HTMLElement */) /*: string */ {
    let selector = '';

    // selector starts with the tag
    selector += element.tagName.toLowerCase();

    // include ID if there is one
    if (element.id) {
      selector += '#' + element.id;
    }

    // include all classes found
    if (element.classList.length) {
      selector += '.' + [...element.classList.values()].join('.');
    }

    return selector;
  }

  function getInlineStyles(
    element /*: HTMLElement */,
    indent /*: string */ = SOFT_TAB
  ) /*: string */ {
    if (element.styles == null) return '';

    let rules = element.styles.value.split(';').filter(Boolean);

    return rules.map(x => indent + x.trim()).join('\n');
  }

  function buildTextAreaEditor(
    css /*: string */,
    onChange /*: Function */
  ) /*: HTMLElement */ {
    let $textarea = document.createElement('textarea');

    $textarea.id = 'my-style-input';
    $textarea.spellcheck = false;
    $textarea.value = css;
    $textarea.placeholder = `/* Enter your styles here. */

/* Alt + Click on an element to add it to the editor. */`;

    // alt + click on an element adds its selector to the textarea
    document.body.addEventListener('click', event => {
      // do nothing when editor is off
      if ($textarea.style.display !== 'block') return;

      // do nothing if click on the editor
      if ($textarea.isSameNode(event.target)) return;

      // only handle Alt + Click
      if (!event.altKey) return;
      if (event.ctrlKey) return;
      if (event.shiftKey) return;
      if (event.metaKey) return;

      event.preventDefault();

      // construct text to add to textarea
      let selector = generateCSSSelector(event.target);
      if (selector) {
        let existingStyles = getInlineStyles(event.target);
        let textToAdd = `${selector} {\n${existingStyles || SOFT_TAB}\n}`;

        $textarea.value = $textarea.value.trimRight() + '\n\n' + textToAdd;

        // highlight added text for easy removal
        $textarea.focus();
        $textarea.setSelectionRange(
          $textarea.value.length - textToAdd.length,
          $textarea.value.length
        );
      }
    });

    // continually update styles with textarea content
    $textarea.addEventListener('keyup', () => onChange($textarea.value));
    $textarea.addEventListener('change', () => onChange($textarea.value));

    // pressing tab should insert spaces instead of focusing another element
    $textarea.addEventListener('keydown', event => {
      let value = $textarea.value;
      let caret = $textarea.selectionStart;

      // if tab is pressed, insert four spaces
      if (event.keyCode === TAB_KEY_CODE) {
        $textarea.value =
          value.substring(0, caret) + SOFT_TAB + value.substring(caret);

        // move caret to after soft tab
        $textarea.setSelectionRange(
          caret + SOFT_TAB_LENGTH,
          caret + SOFT_TAB_LENGTH
        );

        // prevent default tab action that shifts focus to the next element
        event.preventDefault();
      }
    });

    return $textarea;
  }

  /* Preload styles */
  loadStyles().then(css => {
    console.group('my-style');
    console.log(css);
    console.groupEnd();
  });

  window.addEventListener('DOMContentLoaded', async event => {
    let css = await loadStyles();

    applyStyles(css);

    let $editor = buildTextAreaEditor(css, css => {
      /* Updates styles with content in textarea and saves styles. */
      applyStyles(css);
      saveStyles(css);
    });

    // hide editor by default
    $editor.style.display = 'none';
    document.body.appendChild($editor);

    // control + m toggles text area
    window.addEventListener('keydown', event => {
      if (event.ctrlKey && event.keyCode === M_KEY_CODE) {
        if ($editor.style.display !== 'block') {
          $editor.style.display = 'block';
          this.lastFocusElement = document.activeElement;
          $editor.focus();
        } else {
          $editor.style.display = 'none';
          this.lastFocusElement && this.lastFocusElement.focus();
        }
      }
    });
  });
})();
