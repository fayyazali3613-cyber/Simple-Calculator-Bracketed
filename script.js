document.addEventListener("DOMContentLoaded", function () {
    const inputDisplay = document.getElementById("input-line");
    const resultDisplay = document.getElementById("result-line");
    const bracketColors = ["#00000", "#2ecc71", "#3498db", "#e74c3c", "#9b59b6", "#f1c40f"];
    
    let expression = ""; 
    let lastAnswer = ""; // Yeh ab 'C' dabane se delete nahi hoga
    let justCalculated = false;

    function render() {
        let html = "";
        let stack = [];

        for (let char of expression) {
            // Visual change: '*' ko '×' mein badalna
            let displayChar = char === "*" ? "×" : char;

            if (char === "(") {
                let color = bracketColors[stack.length % bracketColors.length];
                stack.push(color);
                html += `<span style="color:${color}">(</span>`;
            } 
            else if (char === ")") {
                let color = stack.pop() || "#333";
                html += `<span style="color:${color}">)</span>`;
            } 
            else {
                // Numbers aur operators ke liye cleaner font span
                html += `<span class="char">${displayChar}</span>`;
            }
        }
        
        inputDisplay.innerHTML = html;

        setTimeout(() => {
            inputDisplay.scrollLeft = inputDisplay.scrollWidth;
        }, 0);
        
        if (!justCalculated) {
            resultDisplay.style.opacity = "0.5";
            resultDisplay.innerText = expression === "" ? "0" : "";
        } else {
            resultDisplay.style.opacity = "1";
        }
    }

    window.append = function(value) {
        if (justCalculated) {
            if (['+', '-', '*', '/'].includes(value)) {
                expression = lastAnswer;
            } else {
                expression = "";
            }
            justCalculated = false;
        }

        if (expression === "0" && /[0-9]/.test(value)) {
            expression = "";
        }

        let lastChar = expression.slice(-1);

        if (value === '.') {
            let parts = expression.split(/[\+\-\*\/]/);
            let currentNumber = parts[parts.length - 1];
            if (currentNumber.includes('.')) return;
            if (expression === "" || /[\+\-\*\/]$/.test(expression)) {
                expression += "0";
            }
        }

        if (value === "(" && /[0-9)]/.test(lastChar)) {
            expression += "*";
        } 
        if (/[0-9]/.test(value) && lastChar === ")") {
            expression += "*";
        }

        if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
            expression = expression.slice(0, -1);
        }

        expression += value;
        render();
    };

    window.calculate = function() {
        if (expression === "") return;
        try {
            // eval hamesha '*' hi use karega, display sirf '×' dikhayega
            let result = eval(expression);
            
            // Lambe decimals ko handle karne ke liye (Optional)
            if (!Number.isInteger(result)) {
                result = Math.round(result * 100000000) / 100000000;
            }

            resultDisplay.innerText = result;
            lastAnswer = result.toString();
            justCalculated = true;
            render();
        } catch {
            resultDisplay.innerText = "Error";
            justCalculated = true;
        }
    };

    window.backspace = function() {
        if (justCalculated) {
            expression = "";
            justCalculated = false;
        } else {
            expression = expression.slice(0, -1);
        }
        render();
    };

    // FIXED: Ab 'Ans' (lastAnswer) clear nahi hoga
    window.clearDisplay = function() {
        expression = "";
        justCalculated = false;
        resultDisplay.innerText = "0";
        render();
    };

    window.useAns = function() {
        if (!lastAnswer || lastAnswer === "") return;
        append(lastAnswer);
    };

    document.addEventListener("keydown", (e) => {
        if (e.key >= '0' && e.key <= '9') append(e.key);
        if (e.key === '+') append('+');
        if (e.key === '-') append('-');
        if (e.key === '*') append('*');
        if (e.key === '/') append('/');
        if (e.key === '.') append('.');
        if (e.key === '(' || e.key === ')') append(e.key);
        if (e.key === 'Enter') { e.preventDefault(); calculate(); }
        if (e.key === 'Backspace') backspace();
        if (e.key === 'Escape') clearDisplay();
    });
});