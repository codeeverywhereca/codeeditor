/*
 * js code editor (Dec 28 2020 - 22122815)
 * https://github.com/codeeverywhereca/codeeditor
 * Copyright 2022, https://codeeverywhere.ca
 * Licensed under the MIT license.
 * Support this project, BTC 19u6CWTxH4cH9V2yTfAemA7gmmh7rANgiv
 */

class ceEditor {
  constructor(code_field, styled_field, html_field, console_field) {
    this.timeout = null;

    this.code_field = code_field;
    this.styled_field = styled_field;
    this.html_field = html_field;
    this.console_field = console_field;

    window.clearSession = this.clearSession;
    window.shareLink = this.shareLink.bind(this);
    window.clearOutput = this.clearOutput.bind(this);

    // Send ouptut to browser screen ..
    const originalConsoleLog = console.log;
    console.log = function () {
      document.getElementById(console_field).innerHTML += '<div class="console-log">' + [...arguments].join(" ") + "</div>";
      originalConsoleLog.apply(null, arguments);
    };

    let initValue;

    // are we using shareLink?
    if (location.hash) {
      initValue = decodeURIComponent(location.hash.slice(1));
      this.setCode(initValue);
    }

    // is there a saved session?
    else if (sessionStorage.getItem("code")) {
      initValue = sessionStorage.getItem("code");
      this.setCode(initValue);
    }

    // use default ..
    else {
      initValue = this.getCode();
    }

    this.setEventListeners();
    this.updateUI(initValue);
    this.updateLineNums(initValue);
    this.runCode();
  }

  // Helpers ..
  setInnerHTML(id, value) {
    document.getElementById(id).innerHTML = value;
  }

  setInnerText(id, value) {
    document.getElementById(id).innerText = value;
  }

  getCode() {
    return document.getElementById(this.code_field).value;
  }

  setCode(value) {
    document.getElementById(this.code_field).value = value;
  }

  clearOutput() {
    this.setInnerHTML(this.html_field, '<div>div id "html-stage"</div>');
    this.setInnerHTML(this.console_field, "<div>console.log</div>");
  }

  clearSession() {
    sessionStorage.removeItem("code");
    location.href = location.protocol + "//" + location.host + location.pathname;
  }

  shareLink() {
    const code = encodeURIComponent(this.getCode());
    prompt(
      "Copy your shareLink",
      location.protocol + "//" + location.host + location.pathname + "#" + code
    );
  }

  encodeHTMLEntities(text, className = "") {
    var textArea = document.createElement("textarea");
    textArea.innerText = text;
    return textArea.innerHTML;
  }

  updateLineNums(value) {
    const textAreaHeight = value.split("\n").length;
    let lineNum = document.getElementById("line-num");
    lineNum.innerHTML = "";

    let buff = "";
    for (var x = 1; x <= textAreaHeight; x++) {
      buff += `<div>${x}</div>`;
    }
    lineNum.innerHTML = buff;
  }

  saveToSession(value) {
    const _this = this;
    try {
      this.setInnerText("auto-save", "Auto Saving ...");
      sessionStorage.setItem("code", value);
      setTimeout(function () {
        _this.setInnerText("auto-save", "Saved!");
      }, 2500);
    } catch (e) {
      _this.setInnerText("auto-save", "Auto Saved Failed!");
    }
  }

  updateUI(value) {
    // save code ..
    this.saveToSession(value);

    this.setInnerText("compiling", "compiling...");

    const textAreaHeight = value.split("\n").length;
    document.getElementById(this.code_field).style.height = textAreaHeight * 23 * 1.2 + "px";

    // syntax ..
    let styledValue = this.encodeHTMLEntities(value)
      .replace(/\.([a-z]+)(\(|\s)/gi, "<span data-token-method>.$1$2</span>")
      .replace(/(\(|\)|\[|\]|\{|\})/gi, "<span data-token-brace>$1</span>")
      .replace(/(^|\s+)(let|const|var|function)/gi, "<span data-token-def>$1$2</span>")
      .replace(/(^|\s+)(if|else|while|return)/gi, "<span data-token-action>$1$2</span>")
      .replace(/(\d+|true|false)/gi, "<span data-token-num>$1</span>")
      .replace(/("|'|`)(.*?)("|'|`)/gi, "<span data-token-str>$1$2$3</span>")
      .replace(/(^|<br>|\s*)\/\/(.+?)(\n|<br>|$)/gi, "<span data-token-comment>$1//$2$3</span>")
      .replace(/\/\*(.+)\*\//gi, "<span data-token-comment>/*$1*/</span>")

    this.setInnerHTML(this.styled_field, styledValue);

    // fix comments syntax ..
    [...document.querySelectorAll("[data-token-comment]")].forEach((elem) => {
      elem.innerText = elem.innerText;
    });
    [...document.querySelectorAll("[data-token-str]")].forEach((elem) => {
      elem.innerText = elem.innerText;
    });
  }

  setEventListeners() {
    const _this = this;

    // on `code` keydown ..
    document.getElementById(this.code_field).addEventListener("keydown", function (event) {
        const insertString = function (str, cursor = 0) {
          let start = this.selectionStart;
          this.value = this.value.slice(0, start) + str + this.value.slice(start);
          this.selectionStart = this.selectionEnd = start + str.length + cursor;
          event.preventDefault();
          _this.updateUI(this.value);
        };

        if (event.key === "{") {
          // find TABs ..
          const search = this.value.slice(0, this.selectionEnd);
          const tabs = search.split(/(^|\n)(\t+).*$/i)[2] || "";
          insertString.call(this, "{\n\t" + tabs + "\n" + tabs + "}", -1 * (tabs.length + 2));
        } else if (event.key === "(") {
          insertString.call(this, "()", -1);
        } else if (event.key === "[") {
          insertString.call(this, "[]", -1);
        } else if (event.key === '"') {
          insertString.call(this, `""`, -1);
        } else if (event.key === "'") {
          insertString.call(this, `''`, -1);
        }

        // comment toggle ..
        else if (event.metaKey && event.key === "/") {
          var start = this.selectionStart;
          const sliced = this.value.slice(0, this.selectionEnd);
          const line = sliced.split("\n").length || 0;
          let lines = this.value.split("\n");

          // is a comment ..
          let direction;
          if (!!lines[line - 1].match(/\s*\/\/.+$/i)) {
            lines[line - 1] = lines[line - 1].replace("//", "");
            direction = -1;
          } else {
            lines[line - 1] = "//" + lines[line - 1];
            direction = 1;
          }

          this.value = lines.join("\n");
          this.selectionStart = this.selectionEnd = start + 2 * direction;

          _this.updateUI(this.value);
          event.preventDefault();
          _this.runCode();
        } else if (event.key === "Tab") {
          insertString.call(this, "\t");
        }
      });

    // on `code` input change ..
    document.getElementById(this.code_field).addEventListener("input", function (event) {
        _this.updateUI(this.value);
        _this.updateLineNums(this.value);

        if (_this.timeout !== null) {
          clearTimeout(_this.timeout);
        }
        _this.timeout = setTimeout(function () {
          _this.runCode();
        }, 2500);
      });
  }

  // main code runner ..
  runCode() {
    const code = this.getCode();

    if (!code && code.length == 0) {
      this.clearOutput();
      return;
    }

    this.setInnerHTML(this.html_field, '<div>div id "html-stage"</div>');
    document.getElementById(this.console_field).innerText += `\n--- --- --- --- ---\n`;

    try {
      // .. detect for loops
      let codeWithLoopCorrect = code.replace(
        /(for|while)\s*\((.+)\)\s*{/gi,
        ";infiniteLoopBreaker_count=0; $1($2){ if(++infiniteLoopBreaker_count>1000) {console.log('<p data-infi>infiniteLoopBreaker (1K Limit)</p>'); break;};"
      );

      // .. try to stop inifite loops
      let infiniteLoopBreaker_count = 0;

      eval(codeWithLoopCorrect);
      
      this.setInnerText("compiling", "done!");
      document.querySelector(".output").scrollTo(0, document.querySelector(".output").scrollHeight);
    } catch (error) {
      this.setInnerHTML(this.console_field, `<p data-error>${error}</p>`);
      this.setInnerText("compiling", "Error!");
    }
  }
}

const editor = new ceEditor("code", "styled", "html-stage", "console-log");
