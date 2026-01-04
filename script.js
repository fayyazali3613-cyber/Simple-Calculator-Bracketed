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
       html += `<span style="color:red; font-weight: 900; display: inline-block; transform: scale(1.2, 1.1); text-shadow: 0.5px 0 0 red, -0.5px 0 0 red;">√</span>`;
            i += 9;
            char = "(";
        }

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
    setTimeout(() => { inputDisplay.scrollLeft = inputDisplay.scrollWidth; }, 0);
    
    // --- YAHAN CHANGE HAI ---
    if (!justCalculated) {
        resultDisplay.style.opacity = "0.5";
        // Jab aap naya kuch type karein, toh "Close bracket" ya purana error hat jaye
        resultDisplay.innerText = expression === "" ? "0" : ""; 
    } else {
        resultDisplay.style.opacity = "1";
    }
}

    // --- APPEND FUNCTION ---
window.append = function(value) {
    if (justCalculated) {
        expression = (['+', '-', '*', '/', '**'].includes(value)) ? lastAnswer : "";
        justCalculated = false;
    }

    let lastChar = expression.slice(-1);

    // 1. START CHECK: Agar screen khali hai, toh sirf '-' ya number/bracket allow ho
    if (expression === "" && ['+', '*', '/', '**'].includes(value)) return;

    // 2. FIX: Agar start mein sirf '-' hai, toh uske baad koi operator (+, *, /, ^) na aaye
    if (expression === "-" && ['+', '-', '*', '/', '**'].includes(value)) return;

    // 3. BRACKET CHECK: '(' ke foran baad sirf number ya '-' allow ho
    if (lastChar === "(" && ['+', '*', '/', '**'].includes(value)) return;

    // 4. Closing bracket logic
    if (value === ")") {
        let openBCount = (expression.match(/\(/g) || []).length;
        let closeBCount = (expression.match(/\)/g) || []).length;
        if (openBCount <= closeBCount) return; 

        while (['+', '-', '*', '/'].includes(expression.slice(-1))) {
            expression = expression.slice(0, -1);
        }
    }

    // 5. Power (^) Logic
    if (value === '**') {
        if (isPowerMode) { exitPower(); return; }
        if (/[0-9)]/.test(lastChar) && expression !== "") {
            expression += "**(";
            isPowerMode = true;
            render(); return;
        }
        return;
    }

    // 6. Operator Swap Logic (Lekin bracket ya start-minus ke baad swap block)
    if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
        let charBeforeLast = expression.slice(-2, -1);
        // Agar operator se pehle '(' hai ya screen par sirf operator hi bacha hai
        if (charBeforeLast === "(" || expression.length === 1) return;
        expression = expression.slice(0, -1);
    }

    if (expression === "0" && /[0-9]/.test(value)) expression = "";
    if (value === "(" && /[0-9)]/.test(lastChar)) expression += "*";
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
