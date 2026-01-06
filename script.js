document.addEventListener("DOMContentLoaded", function () {
    const inputDisplay = document.getElementById("input-line");
    const resultDisplay = document.getElementById("result-line");
    const bracketColors = ["#000000", "#2ecc71", "#3498db", "#e74c3c", "#9b59b6", "#f1c40f"];

    let expression = "";
    let lastAnswer = "";
    let justCalculated = false;
    let isPowerMode = false;
    let cursorSpan = 0; // Cursor position track karne ke liye

    // --- RENDER FUNCTION ---
    function render() {
        let html = "";
        let stack = [];
        let i = 0;

        while (i < expression.length) {
            // Cursor placement
            if (i === cursorSpan) html += `<span class="cursor"></span>`;

            let char = expression[i];

            // Power (**) rendering
            if (expression.substring(i, i + 3) === "**(") {
                i += 3;
                let powerContent = "";
                let depth = 1;
                while (i < expression.length && depth > 0) {
                    if (expression[i] === "(") depth++;
                    if (expression[i] === ")") depth--;
                    if (depth > 0) powerContent += expression[i];
                    i++;
                }
                html += `<span class="sup">${powerContent || "^"}</span>`;
                continue;
            }

            // Square Root display
            if (expression.substring(i, i + 10) === "Math.sqrt(") {
                html += `<span style="color:red; font-weight:900;">√</span>`;
                i += 9;
                char = "(";
            }

            // Bracket Coloring
            if (char === "(") {
                let color = bracketColors[stack.length % bracketColors.length];
                stack.push(color);
                html += `<span style="color:${color}">(</span>`;
            } else if (char === ")") {
                let color = stack.pop() || "#333";
                html += `<span style="color:${color}">)</span>`;
            } else {
                let displayChar = char === "*" ? "×" : (char === "/" ? "÷" : char);
                html += `<span class="char">${displayChar}</span>`;
            }
            i++;
        }

        // End of line cursor
        if (i === cursorSpan) html += `<span class="cursor"></span>`;

        inputDisplay.innerHTML = html;
        
        setTimeout(() => {
            // Agar cursor end par hai to scroll end par jaye
            if (cursorSpan === expression.length) {
                inputDisplay.scrollLeft = inputDisplay.scrollWidth;
            }
        }, 50);

        if (!justCalculated) {
            resultDisplay.style.opacity = "0.5";
            resultDisplay.innerText = expression === "" ? "0" : "";
        } else {
            resultDisplay.style.opacity = "1";
        }
    }

    // --- APPEND FUNCTION ---
    window.append = function (value) {
        if (justCalculated) {
            expression = (['+', '-', '*', '/', '**'].includes(value)) ? lastAnswer : "";
            justCalculated = false;
            cursorSpan = expression.length;
        }

        let lastChar = expression.slice(-1);

        // Decimal Logic
        if (value === '.') {
            if (expression === "" || /[\+\-\*\/\(]/.test(lastChar)) {
                expression += "0.";
                cursorSpan = expression.length;
                render();
                return;
            }
            let parts = expression.split(/[\+\-\*\/\(\)]/);
            let currentNumber = parts[parts.length - 1];
            if (currentNumber.includes('.')) return;
        }

        // Basic validation
        if (expression === "" && ['+', '*', '/', '**'].includes(value)) return;
        if (expression === "-" && ['+', '-', '*', '/', '**'].includes(value)) return;
        if (lastChar === "(" && ['+', '*', '/', '**'].includes(value)) return;

        // Brackets check
        if (value === ")") {
            let openBCount = (expression.match(/\(/g) || []).length;
            let closeBCount = (expression.match(/\)/g) || []).length;
            if (openBCount <= closeBCount) return;
            while (['+', '-', '*', '/'].includes(expression.slice(-1))) {
                expression = expression.slice(0, -1);
            }
        }

        // Power Mode
        if (value === '**') {
            if (isPowerMode) { exitPower(); return; }
            if (/[0-9)]/.test(lastChar) && expression !== "") {
                expression += "**(";
                isPowerMode = true;
                cursorSpan = expression.length;
                render(); return;
            }
            return;
        }

        // Operator Swap
        if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
            let charBeforeLast = expression.slice(-2, -1);
            if (charBeforeLast === "(" || expression.length === 1) return;
            expression = expression.slice(0, -1);
        }

        if (expression === "0" && /[0-9]/.test(value)) expression = "";

        // Auto-multiply
        if ((value === "(" || value === "Math.sqrt(") && /[0-9)]/.test(lastChar)) {
            expression += "*";
        }
        if (/[0-9]/.test(value) && lastChar === ")") expression += "*";

        // Insertion at cursor position
        let part1 = expression.slice(0, cursorSpan);
        let part2 = expression.slice(cursorSpan);
        expression = part1 + value + part2;
        cursorSpan += value.length;
        
        render();
    };

    // --- SQUARE ROOT FUNCTION ---
    window.appendSqrt = function () {
        if (justCalculated) {
            expression = "";
            justCalculated = false;
        }
        let lastChar = expression.slice(-1);
        if (expression !== "" && /[0-9)]/.test(lastChar)) {
            expression += "*";
        }
        expression += "Math.sqrt(";
        cursorSpan = expression.length;
        render();
    };

    window.exitPower = function () {
        if (isPowerMode) {
            if (expression.endsWith("**(")) {
                expression = expression.slice(0, -3);
            } else {
                expression += ")";
            }
            isPowerMode = false;
            cursorSpan = expression.length;
            render();
        }
    };

    window.toggleTheme = function () {
        document.body.classList.toggle('light-mode');
    };

    window.calculate = function () {
        if (expression === "") return;
        if (isPowerMode) exitPower();

        let tempExpr = expression;
        let openB = (tempExpr.match(/\(/g) || []).length;
        let closeB = (tempExpr.match(/\)/g) || []).length;

        if (openB > closeB) {
            resultDisplay.innerText = "Close bracket";
            resultDisplay.style.opacity = "1";
            resultDisplay.style.color = "#ff4d4d";
            setTimeout(() => {
                resultDisplay.style.color = "#555";
                if (!justCalculated) resultDisplay.style.opacity = "0.5";
            }, 2000);
            return;
        }

        while (['+', '-', '*', '/'].includes(tempExpr.slice(-1))) {
            tempExpr = tempExpr.slice(0, -1);
        }

        try {
            let result = eval(tempExpr);
            if (!Number.isInteger(result)) {
                result = Math.round(result * 100000000) / 100000000;
            }
            resultDisplay.innerText = result;
            lastAnswer = result.toString();
            justCalculated = true;
            render();
        } catch {
            resultDisplay.innerText = "Error";
            resultDisplay.style.opacity = "1";
            justCalculated = false;
        }
    };

    window.backspace = function () {
        if (justCalculated) {
            expression = "";
            justCalculated = false;
            cursorSpan = 0;
        } else if (cursorSpan > 0) {
            let part1 = expression.slice(0, cursorSpan - 1);
            let part2 = expression.slice(cursorSpan);
            expression = part1 + part2;
            cursorSpan--;
        }
        render();
    };

    window.clearDisplay = function () {
        expression = "";
        isPowerMode = false;
        justCalculated = false;
        cursorSpan = 0;
        resultDisplay.innerText = "0";
        render();
    };

    window.useAns = function () { if (lastAnswer) append(lastAnswer); };

    // Keyboard support
    document.addEventListener("keydown", (e) => {
        if (/[0-9]/.test(e.key)) append(e.key);
        if (['+', '-', '*', '/'].includes(e.key)) append(e.key);
        if (e.key === '^') append('**');
        if (e.key === 'Enter') { e.preventDefault(); isPowerMode ? exitPower() : calculate(); }
        if (e.key === 'Backspace') backspace();
        if (e.key === 'Escape') clearDisplay();
    });

    // Click to Edit Logic
    inputDisplay.addEventListener("click", (e) => {
        const chars = inputDisplay.innerText;
        const rect = inputDisplay.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // Simple logic to move cursor to end on click 
        // (Click specific position needs high-level measurement)
        cursorSpan = expression.length; 
        render();
    });

    render(); // Initial render
});