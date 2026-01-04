document.addEventListener("DOMContentLoaded", function () {
	// --- SQUARE ROOT FUNCTION ---
    window.appendSqrt = function() {
        if (justCalculated) {
            expression = "";
            justCalculated = false;
        }
        
        let lastChar = expression.slice(-1);
        
        // Agar pehle koi number ya close bracket hai to auto-multiply '*' lagao
        if (expression !== "" && /[0-9)]/.test(lastChar)) {
            expression += "*";
        }
        
        expression += "Math.sqrt(";
        render();
    };
    const inputDisplay = document.getElementById("input-line");
    const resultDisplay = document.getElementById("result-line");
    const bracketColors = ["#000000","#2ecc71", "#3498db", "#e74c3c", "#9b59b6", "#f1c40f"];
    
    let expression = ""; 
    let lastAnswer = ""; 
    let justCalculated = false;
    let isPowerMode = false; // Power mode track karne ke liye

    // --- RENDER FUNCTION (Superscript Display ke liye) ---
function render() {
    let html = "";
    let stack = [];
    let i = 0;

    while (i < expression.length) {
        let char = expression[i];

        // Power aur Root ki display logic (Jo pehle set ki thi)
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

        if (expression.substring(i, i + 10) === "Math.sqrt(") {
            html += `<span style="color:red; font-weight: 900; display: inline-block; transform: scale(1.2, 1.1); text-shadow: 0.5px 0 0 red, -0.5px 0 0 red;">√</span>`;
            i += 10;
            char = "(";
        }

        // Brackets coloring logic
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

    inputDisplay.innerHTML = html;

    // Mobile Responsive Scroll Fix
    setTimeout(() => { 
        inputDisplay.scrollLeft = inputDisplay.scrollWidth; 
        resultDisplay.scrollLeft = resultDisplay.scrollWidth;
    }, 50); 
    
    // Result Display logic
    if (!justCalculated) {
        resultDisplay.style.opacity = "0.5";
        if (resultDisplay.innerText !== "Error" && resultDisplay.innerText !== "Close bracket") {
            resultDisplay.innerText = expression === "" ? "0" : ""; 
        }
    } else {
        resultDisplay.style.opacity = "1";
    }
}

    // --- APPEND FUNCTION ---
window.append = function(value) {
    if (justCalculated) {
        // Agar calculation ke baad operator dabayein to Ans use ho, warna screen saaf ho
        expression = (['+', '-', '*', '/', '**'].includes(value)) ? lastAnswer : "";
        justCalculated = false;
    }

    let lastChar = expression.slice(-1);

    // --- REQUIREMENT 2: Decimal (Ishariya) Logic ---
    if (value === '.') {
        // Agar expression khali hai ya pichla char operator/bracket hai, to "0." kar do
        if (expression === "" || /[\+\-\*\/\(]/.test(lastChar)) {
            expression += "0.";
            render();
            return;
        }

        // --- REQUIREMENT 1: Ek number mein doosra dot block karna ---
        // Piche se check karo ke is current number mein pehle se dot hai ya nahi
        let parts = expression.split(/[\+\-\*\/\(\)]/); // Equation ko operators se todo
        let currentNumber = parts[parts.length - 1]; // Akhri hissa uthao
        if (currentNumber.includes('.')) return; // Agar dot pehle se hai to wapas jao
    }

    // --- Baqi Purana Logic (Safe) ---
    if (expression === "" && ['+', '*', '/', '**'].includes(value)) return;
    if (expression === "-" && ['+', '-', '*', '/', '**'].includes(value)) return;
    if (lastChar === "(" && ['+', '*', '/', '**'].includes(value)) return;

    if (value === ")") {
        let openBCount = (expression.match(/\(/g) || []).length;
        let closeBCount = (expression.match(/\)/g) || []).length;
        if (openBCount <= closeBCount) return; 
        while (['+', '-', '*', '/'].includes(expression.slice(-1))) {
            expression = expression.slice(0, -1);
        }
    }

    if (value === '**') {
        if (isPowerMode) { exitPower(); return; }
        if (/[0-9)]/.test(lastChar) && expression !== "") {
            expression += "**(";
            isPowerMode = true;
            render(); return;
        }
        return;
    }

    // Operator Swap Logic
    if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
        let charBeforeLast = expression.slice(-2, -1);
        if (charBeforeLast === "(" || expression.length === 1) return;
        expression = expression.slice(0, -1);
    }

    if (expression === "0" && /[0-9]/.test(value)) expression = "";
    
    // Auto-multiply brackets/sqrt
	if (
	   (value === "(" || value === "Math.sqrt(") &&
	   /[0-9)]/.test(lastChar)
	) {
	   expression += "*";
	}

    if (/[0-9]/.test(value) && lastChar === ")") expression += "*";

    expression += value;
    render();
};


    // --- EXIT POWER MODE ---
    window.exitPower = function() {
        if (isPowerMode) {
            if (expression.endsWith("**(")) {
                expression = expression.slice(0, -3);
            } else {
                expression += ")"; // Bracket close karke bahar aaye
            }
            isPowerMode = false;
            render();
        }
    };

    // --- THEME TOGGLE ---
    window.toggleTheme = function() {
        document.body.classList.toggle('light-mode');
    };

    // --- CALCULATE ---
 window.calculate = function() {
    if (expression === "") return;
    
    // Power mode khatam karein agar on hai
    if (isPowerMode) exitPower();

    let tempExpr = expression;

    // Brackets check karein
    let openB = (tempExpr.match(/\(/g) || []).length;
    let closeB = (tempExpr.match(/\)/g) || []).length;
    
    // AGAR BRACKET CLOSE NAHI HAIN:
    if (openB > closeB) {
        resultDisplay.innerText = "Close bracket";
        resultDisplay.style.opacity = "1";
        resultDisplay.style.color = "#ff4d4d"; // Thoda red color warning ke liye
        
        // 2 second baad wapas normal color kar den
        setTimeout(() => {
            resultDisplay.style.color = "#555";
            if (!justCalculated) resultDisplay.style.opacity = "0.5";
        }, 2000);
        
        return; // Calculation yahin rok den
    }

    // Baqi purana calculation logic...
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
        justCalculated = true; // Sirf sahi result par ye true hoga
        render();
    } catch {
        // ERROR LOGIC:
        resultDisplay.innerText = "Error";
        resultDisplay.style.opacity = "1";
        
        // Sabse important: justCalculated ko FALSE rakhein taake 
        // naya button dabane par purani equation delete na ho
        justCalculated = false; 
    }
};

    // --- BACKSPACE & CLEAR ---
    window.backspace = function() {
        if (justCalculated) { expression = ""; justCalculated = false; }
        else {
            if (expression.endsWith("**(")) { isPowerMode = false; expression = expression.slice(0, -3); }
            else if (expression.endsWith("Math.sqrt(")) { expression = expression.slice(0, -10); }
            else { expression = expression.slice(0, -1); }
        }
        render();
    };

    window.clearDisplay = function() {
        expression = ""; isPowerMode = false; justCalculated = false;
        resultDisplay.innerText = "0";
        render();
    };

    window.useAns = function() { if (lastAnswer) append(lastAnswer); };

    // Keyboard support
    document.addEventListener("keydown", (e) => {
        if (/[0-9]/.test(e.key)) append(e.key);
        if (['+', '-', '*', '/'].includes(e.key)) append(e.key);
        if (e.key === '^') append('**');
        if (e.key === 'Enter') { e.preventDefault(); isPowerMode ? exitPower() : calculate(); }
        if (e.key === 'Backspace') backspace();
        if (e.key === 'Escape') clearDisplay();
    });
});
