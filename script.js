document.addEventListener("DOMContentLoaded", function () {
    const inputDisplay = document.getElementById("input-line");
    const resultDisplay = document.getElementById("result-line");
    const bracketColors = ["#00000", "#2ecc71", "#3498db", "#e74c3c", "#9b59b6", "#f1c40f"];
    
    let expression = ""; 
    let lastAnswer = ""; 
    let justCalculated = false;

    function render() {
        let html = "";
        let stack = [];
        for (let char of expression) {
            let displayChar = char === "*" ? "×" : char;
            if (char === "(") {
                let color = bracketColors[stack.length % bracketColors.length];
                stack.push(color);
                html += `<span style="color:${color}">(</span>`;
            } else if (char === ")") {
                let color = stack.pop() || "#333";
                html += `<span style="color:${color}">)</span>`;
            } else {
                html += `<span class="char">${displayChar}</span>`;
            }
        }
        inputDisplay.innerHTML = html;
        setTimeout(() => { inputDisplay.scrollLeft = inputDisplay.scrollWidth; }, 0);
        
        if (!justCalculated) {
            resultDisplay.style.opacity = "0.5";
            resultDisplay.innerText = expression === "" ? "0" : "";
        } else {
            resultDisplay.style.opacity = "1";
        }
    }

    window.append = function(value) {
        if (justCalculated) {
            expression = (['+', '-', '*', '/'].includes(value)) ? lastAnswer : "";
            justCalculated = false;
        }

        let lastChar = expression.slice(-1);

        // REQUIREMENT 1: Bracket '(' ke foran baad sirf number ya minus allow ho
        if (lastChar === "(" && ['+', '*', '/'].includes(value)) {
            return; 
        }

        // REQUIREMENT 2: Bracket close ')' se pehle agar operator ho to usay hata do
        if (value === ")") {
            // Agar expression khali hai ya pehle koi bracket open nahi hui to ignore karein
            let openBCount = (expression.match(/\(/g) || []).length;
            let closeBCount = (expression.match(/\)/g) || []).length;
            if (openBCount <= closeBCount) return; 

            while (['+', '-', '*', '/'].includes(expression.slice(-1))) {
                expression = expression.slice(0, -1);
            }
        }

        if (expression === "0" && /[0-9]/.test(value)) expression = "";

        if (value === '.') {
            let parts = expression.split(/[\+\-\*\/]/);
            if (parts[parts.length - 1].includes('.')) return;
            if (expression === "" || /[\+\-\*\/]$/.test(expression)) expression += "0";
        }

        if (value === "(" && /[0-9)]/.test(lastChar)) expression += "*";
        if (/[0-9]/.test(value) && lastChar === ")") expression += "*";

        if (['+', '-', '*', '/'].includes(value) && ['+', '-', '*', '/'].includes(lastChar)) {
            expression = expression.slice(0, -1);
        }

        expression += value;
        render();
    };

    window.calculate = function() {
        if (expression === "") return;
        let tempExpr = expression;

        let openB = (tempExpr.match(/\(/g) || []).length;
        let closeB = (tempExpr.match(/\)/g) || []).length;
        
        if (openB > closeB) {
            resultDisplay.innerText = "Close brackets";
            return;
        }

        // REQUIREMENT 3: End operator clean taake error na aaye
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
            justCalculated = true;
        }
    };

    window.backspace = function() {
        if (justCalculated) { expression = ""; justCalculated = false; }
        else { expression = expression.slice(0, -1); }
        render();
    };

    window.clearDisplay = function() {
        expression = ""; justCalculated = false;
        resultDisplay.innerText = "0";
        render();
    };

    window.useAns = function() {
        if (lastAnswer) append(lastAnswer);
    };

    document.addEventListener("keydown", (e) => {
        if (/[0-9]/.test(e.key)) append(e.key);
        if (['+', '-', '*', '/'].includes(e.key)) append(e.key);
        if (e.key === '.') append('.');
        if (e.key === '(' || e.key === ')') append(e.key);
        if (e.key === 'Enter') { e.preventDefault(); calculate(); }
        if (e.key === 'Backspace') backspace();
        if (e.key === 'Escape') clearDisplay();
    });
});

function playClickSound() {
    // 1. Audio Context banayein
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // 2. Agar browser ne block kiya hua hai to usay resume karein
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine'; 
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz thori clear awaz hai
    
    // 3. Volume thora tez (0.1 se barha kar 0.2 kar diya)
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}