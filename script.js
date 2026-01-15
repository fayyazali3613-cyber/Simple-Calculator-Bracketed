document.addEventListener("DOMContentLoaded", function () {

    /* ===============================
       DOM ELEMENTS & CONSTANTS
    =============================== */
    const inputDisplay  = document.getElementById("input-line");
    const resultDisplay = document.getElementById("result-line");

    const bracketColors = [
        "#000000",
        "#2ecc71",
        "#3498db",
        "#e74c3c",
        "#9b59b6",
        "#f1c40f"
    ];

    /* ===============================
       STATE VARIABLES
    =============================== */
    let expression     = "";
    let lastAnswer     = "";
    let justCalculated = false;
    let isPowerMode    = false;
    let isManualEditing = false;
    let cursorPosition = 0;
    let powerStartIndex = -1;

    /* ===============================
       EDITABLE INPUT LOGIC
    =============================== */
    inputDisplay.addEventListener("input", function () {
        isManualEditing = true; 
        
        let manualText = inputDisplay.innerText;
        // FIX: √ ko as it is rahne do, kisi bhi conversion ke baghair
        expression = manualText
            .replace(/×/g, "*")
            .replace(/÷/g, "/");

        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(inputDisplay);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            cursorPosition = preCaretRange.toString().length;
        }

        if (expression === "") {
            resultDisplay.innerText = "0";
        }
    });

    inputDisplay.addEventListener("click", function () {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(inputDisplay);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            cursorPosition = preCaretRange.toString().length;
        }
        
        if (justCalculated) {
            justCalculated = false;
            resultDisplay.style.opacity = "0.5";
        }
    });

    /* ===============================
       RENDER FUNCTION
    =============================== */
    function render() {
        if (isManualEditing) {
            isManualEditing = false;
            return;
        }

        let html = "";
        let stack = [];
        let i = 0;
        let inPowerSection = false;
        let powerDepth = 0;

        while (i < expression.length) {
            let char = expression[i];

            // Power mode start
            if (!inPowerSection && expression.substring(i, i + 3) === "**(") {
                inPowerSection = true;
                powerDepth = 1;
                
                html += `<span style="color:red; font-size:0.8em; vertical-align:super;">^</span>`;
                
                i += 3;
                continue;
            }

            // Handle power content
            if (inPowerSection) {
                if (expression[i] === "(") powerDepth++;
                if (expression[i] === ")") {
                    powerDepth--;
                    if (powerDepth === 0) {
                        inPowerSection = false;
                        i++;
                        continue;
                    }
                }
                
                html += `<span style="color:red;">${expression[i]}</span>`;
                i++;
                continue;
            }

            // Square root - FIX: sirf √ character dikhao
            if (expression[i] === '√') {
                html += `<span style="color:red;font-weight:900;transform:scale(1.2,1.1)">√</span>`;
                i++;
                continue;
            }

            // Brackets coloring
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
                let displayChar =
                    char === "*" ? "×" :
                    char === "/" ? "÷" :
                    char;

                html += `<span class="char">${displayChar}</span>`;
            }

            i++;
        }

        const wasFocused = document.activeElement === inputDisplay;
        
        inputDisplay.innerHTML = html;

        if (wasFocused && html.length > 0) {
            setTimeout(() => {
                setCursorPosition(cursorPosition);
            }, 10);
        }

        setTimeout(() => {
            inputDisplay.scrollLeft  = inputDisplay.scrollWidth;
            resultDisplay.scrollLeft = resultDisplay.scrollWidth;
        }, 50);

        if (!justCalculated) {
            resultDisplay.style.opacity = "0.5";
            if (!["Error", "Close bracket", "Enter operator", "Invalid closing", "Invalid after ("].includes(resultDisplay.innerText)) {
                resultDisplay.innerText = expression === "" ? "0" : "";
            }
        } else {
            resultDisplay.style.opacity = "1";
        }
    }

    /* ===============================
       HELPER FUNCTIONS
    =============================== */
    function setCursorPosition(pos) {
        const textNodes = getTextNodes(inputDisplay);
        let charCount = 0;
        
        for (const node of textNodes) {
            if (charCount + node.textContent.length >= pos) {
                const range = document.createRange();
                const selection = window.getSelection();
                range.setStart(node, Math.min(pos - charCount, node.textContent.length));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                inputDisplay.focus();
                break;
            }
            charCount += node.textContent.length;
        }
    }

    function getTextNodes(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }

    function showResultMessage(message) {
        resultDisplay.innerText = message;
        resultDisplay.style.opacity = "1";
        resultDisplay.style.color = "#ff4d4d";
        justCalculated = false;
        
        setTimeout(() => {
            resultDisplay.style.color = "#555";
            if (expression === "") {
                resultDisplay.innerText = "0";
            } else {
                resultDisplay.innerText = "";
            }
            if (!justCalculated) resultDisplay.style.opacity = "0.5";
        }, 2000);
    }

    /* ===============================
       APPEND & INPUT HANDLING
    =============================== */
    window.append = function (value) {
        isManualEditing = false;
        
        // FIX: AGAR JUST CALCULATED HAI AUR OPERATOR HAI, TO ANSWER KO EXPRESSION MEIN DAL DO
        if (justCalculated) {
            if (['+', '-', '*', '/', '**'].includes(value)) {
                // Operator press kiya hai, to answer ko expression mein daal do
                expression = lastAnswer;
                cursorPosition = expression.length;
                justCalculated = false;
                
                // Ab operator append karo
                expression += value;
                cursorPosition = expression.length;
                render();
                return;
            } else if (!['√'].includes(value)) { // FIX: √ ko include kiya
                // Agar operator nahi hai, to naye calculation shuru karo
                expression = "";
                cursorPosition = 0;
                justCalculated = false;
                isPowerMode = false;
            }
        }

        let charBeforeCursor = cursorPosition > 0 ? expression[cursorPosition - 1] : '';
        let lastChar = expression.slice(-1);

        // 1. EXCESS CLOSING BRACKET CHECK
        if (value === ")") {
            let openBrackets = (expression.match(/\(/g) || []).length;
            let closeBrackets = (expression.match(/\)/g) || []).length;
            
            if (closeBrackets >= openBrackets) {
                showResultMessage("Invalid closing");
                return;
            }
            
            // FIX 2: OPERATOR K BAAD BRACKET CLOSE KARNE PAR OPERATOR REMOVE KARO
            if (cursorPosition > 0) {
                // Check if last character before cursor is an operator
                if (['+', '-', '*', '/'].includes(charBeforeCursor)) {
                    // Check if this is right after opening bracket like "(+"
                    if (cursorPosition >= 2) {
                        let twoCharsBefore = expression.slice(cursorPosition - 2, cursorPosition);
                        if (twoCharsBefore === "(+" || twoCharsBefore === "(*" || 
                            twoCharsBefore === "(/" || twoCharsBefore === "(-") {
                            // Remove the operator and add closing bracket
                            expression = expression.slice(0, cursorPosition - 1) + ")" + expression.slice(cursorPosition);
                            // cursorPosition remains same because we replaced operator with )
                            render();
                            return;
                        }
                    }
                    
                    // Check if this operator is at the beginning of expression or after another operator
                    let hasValidContentBefore = false;
                    for (let i = cursorPosition - 2; i >= 0; i--) {
                        if (/[0-9)]/.test(expression[i])) {
                            hasValidContentBefore = true;
                            break;
                        }
                        if (expression[i] === '(') break;
                    }
                    
                    if (!hasValidContentBefore) {
                        // Remove the operator and add closing bracket
                        expression = expression.slice(0, cursorPosition - 1) + ")" + expression.slice(cursorPosition);
                        // cursorPosition remains same
                        render();
                        return;
                    }
                }
            }
        }

        // 2. FIX 1: BRACKET K START MEIN ONLY MINUS ALLOW, BAQI OPERATORS NAHI
        if (value === '(') {
            // Nothing special for opening bracket
        } else if (charBeforeCursor === '(') {
            // After opening bracket, only allow: numbers, minus, sqrt, or another opening bracket
            if (!/[0-9\-]/.test(value) && value !== '√' && value !== '(') { // FIX: √ ko allow kiya
                showResultMessage("Invalid after (");
                return;
            }
        }

        // 3. POWER BUTTON HANDLING
        if (value === '**') {
            if (isPowerMode) {
                exitPower();
                return;
            }
            
            if (cursorPosition === 0) return;
            if (!/[0-9)]/.test(charBeforeCursor)) return;
            
            isPowerMode = true;
            powerStartIndex = cursorPosition;
            
            expression = expression.slice(0, cursorPosition) + "**(" + expression.slice(cursorPosition);
            cursorPosition += 3;
            render();
            return;
        }

        // 4. CHECK FOR OPERATOR AFTER POWER MODE EXIT
        if (isPowerMode && !['0','1','2','3','4','5','6','7','8','9','+','-','*','/','(',')','.','√'].includes(value)) { // FIX: √ ko include kiya
            if (/[0-9]/.test(value)) {
                showResultMessage("Enter operator");
                return;
            }
        }

        // 5. NUMBER AFTER CLOSING BRACKET OR POWER WITHOUT OPERATOR
        if (/[0-9.]/.test(value) && cursorPosition > 0) {
            let charAtPos = expression[cursorPosition - 1];
            if (charAtPos === ')' || (isPowerMode && charBeforeCursor === ')')) {
                showResultMessage("Enter operator");
                return;
            }
        }

        // 6. FIX: BRACKET K BAAD MINUS LAGANE K BAAD DUSRA OPERATOR NAHI LAGNA CHAHIYE
        if (['+', '*', '/'].includes(value) && cursorPosition > 0) {
            // Check if we're trying to add operator after (-
            if (cursorPosition >= 2) {
                let twoCharsBefore = expression.slice(cursorPosition - 2, cursorPosition);
                if (twoCharsBefore === "(-") {
                    showResultMessage("Invalid after (");
                    return;
                }
            }
        }

        // Decimal handling
        if (value === '.') {
            let left = cursorPosition - 1;
            while (left >= 0 && /[0-9]/.test(expression[left])) {
                left--;
            }
            let right = cursorPosition;
            while (right < expression.length && /[0-9]/.test(expression[right])) {
                right++;
            }
            
            const currentNumber = expression.slice(left + 1, right);
            if (currentNumber.includes('.')) return;
            
            if (cursorPosition === 0 || /[\+\-\*\/\(]/.test(charBeforeCursor)) {
                expression = expression.slice(0, cursorPosition) + "0." + expression.slice(cursorPosition);
                cursorPosition += 2;
                render();
                return;
            }
        }

        // Invalid operator at start
        if (cursorPosition === 0 && ['+', '*', '/'].includes(value)) return;
        
        // Invalid operator after ( (already handled above, but keeping for completeness)
        if (charBeforeCursor === "(" && ['+', '*', '/'].includes(value)) {
            showResultMessage("Invalid after (");
            return;
        }

        // Handle operator replacement
        if (['+', '-', '*', '/'].includes(value) && 
            cursorPosition > 0 && ['+', '-', '*', '/'].includes(charBeforeCursor)) {
            
            expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            cursorPosition--;
            
            if (cursorPosition === 0 || expression[cursorPosition - 2] === "(") {
                expression = expression.slice(0, cursorPosition) + charBeforeCursor + expression.slice(cursorPosition);
                cursorPosition++;
                return;
            }
        }

        // Handle multiplication insertion before brackets/numbers
        if ((value === "(" || value === "√") && // FIX: √ ke liye multiplication
            cursorPosition > 0 && /[0-9)]/.test(charBeforeCursor)) {
            expression = expression.slice(0, cursorPosition) + "*" + expression.slice(cursorPosition);
            cursorPosition++;
        }

        // Insert value at cursor position
        expression = expression.slice(0, cursorPosition) + value + expression.slice(cursorPosition);
        cursorPosition += value.length;
        
        render();
    };

    /* ===============================
       POWER MODE EXIT
    =============================== */
    window.exitPower = function () {
        if (!isPowerMode) return;

        let tempPos = powerStartIndex + 3;
        let depth = 1;
        
        while (tempPos < expression.length && depth > 0) {
            if (expression[tempPos] === "(") depth++;
            if (expression[tempPos] === ")") depth--;
            tempPos++;
        }
        
        if (depth > 0) {
            expression += ")";
            cursorPosition = expression.length;
        }
        
        isPowerMode = false;
        powerStartIndex = -1;
        render();
    };

    /* ===============================
       SPECIAL FUNCTIONS (FIXED)
    =============================== */
    window.appendSqrt = function () {
        inputDisplay.focus();
        if (justCalculated) {
            expression = "";
            cursorPosition = 0;
            justCalculated = false;
            isPowerMode = false;
        }

        let lastChar = expression.slice(-1);
        if (expression !== "" && /[0-9)]/.test(lastChar)) {
            expression += "*";
            cursorPosition = expression.length;
        }

        // FIX: sirf √ character insert karo, koi bracket nahi
        expression = expression.slice(0, cursorPosition) + "√" + expression.slice(cursorPosition);
        cursorPosition += 1;
        render();
    };

    window.useAns = function () {
        if (lastAnswer) {
            inputDisplay.focus();
            cursorPosition = expression.length;
            window.append(lastAnswer);
        }
    };

    window.toggleTheme = function () {
        document.body.classList.toggle("light-mode");
    };

    /* ===============================
       CALCULATE FUNCTION (COMPLETELY FIXED)
    =============================== */
    window.calculate = function () {
        if (expression === "") return;
        if (isPowerMode) exitPower();

        let tempExpr = expression;

        // FIX: √ ko Math.sqrt( mein convert karo calculation ke liye
        tempExpr = tempExpr.replace(/√/g, "Math.sqrt(");
        
        // Count brackets after conversion
        let openB  = (tempExpr.match(/\(/g) || []).length;
        let closeB = (tempExpr.match(/\)/g) || []).length;

        // FIX: Agar √ hai to automatically closing brackets add karo
        if (tempExpr.includes("Math.sqrt(")) {
            let sqrtCount = (tempExpr.match(/Math\.sqrt\(/g) || []).length;
            let missingBrackets = openB - closeB;
            
            // Agar brackets missing hain to automatically add karo
            if (missingBrackets > 0) {
                tempExpr += ")".repeat(missingBrackets);
                closeB += missingBrackets;
            }
            
            // Extra check: har √ ke liye closing bracket ensure karo
            for (let i = 0; i < sqrtCount; i++) {
                let sqrtIndex = tempExpr.indexOf("Math.sqrt(");
                if (sqrtIndex === -1) break;
                
                let afterSqrt = tempExpr.substring(sqrtIndex + 10);
                let depth = 1;
                let j = 0;
                
                while (j < afterSqrt.length && depth > 0) {
                    if (afterSqrt[j] === "(") depth++;
                    if (afterSqrt[j] === ")") depth--;
                    j++;
                }
                
                // Agar √ ke baad closing bracket nahi hai to add karo
                if (depth > 0) {
                    tempExpr += ")";
                    closeB++;
                }
            }
        }

        // Sirf agar √ nahi hai aur brackets missing hain tab error dikhao
        if (openB > closeB && !tempExpr.includes("Math.sqrt(")) {
            showResultMessage("Close bracket");
            return;
        }

        // Remove trailing operators
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
            
            cursorPosition = expression.length;
            isPowerMode = false;
            render();

        } catch (error) {
            console.error("Calculation error:", error);
            resultDisplay.innerText = "Error";
            resultDisplay.style.opacity = "1";
            justCalculated = false;
        }
    };

    /* ===============================
       CLEAR & BACKSPACE
    =============================== */
    window.backspace = function () {
        inputDisplay.focus();
        
        if (justCalculated) {
            expression = "";
            cursorPosition = 0;
            justCalculated = false;
            isPowerMode = false;
            powerStartIndex = -1;
        } else if (isPowerMode) {
            if (cursorPosition >= powerStartIndex + 3) {
                expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
                cursorPosition--;
                
                let tempPos = powerStartIndex + 3;
                let depth = 1;
                while (tempPos < expression.length && depth > 0) {
                    if (expression[tempPos] === "(") depth++;
                    if (expression[tempPos] === ")") depth--;
                    tempPos++;
                }
                
                if (depth === 0) {
                    isPowerMode = false;
                    powerStartIndex = -1;
                }
            } else {
                expression = expression.slice(0, powerStartIndex) + expression.slice(powerStartIndex + 3);
                cursorPosition = powerStartIndex;
                isPowerMode = false;
                powerStartIndex = -1;
            }
        } else if (cursorPosition > 0 && expression[cursorPosition - 1] === '√') { // FIX: √ delete karne ke liye
            expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            cursorPosition--;
        } else if (cursorPosition > 0) {
            expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            cursorPosition--;
        }
        render();
    };

    window.clearDisplay = function () {
        expression = "";
        cursorPosition = 0;
        isPowerMode = false;
        powerStartIndex = -1;
        justCalculated = false;
        resultDisplay.innerText = "0";
        inputDisplay.focus();
        render();
    };

    /* ===============================
       KEYBOARD SUPPORT
    =============================== */
    document.addEventListener("keydown", (e) => {
        if (document.activeElement === inputDisplay) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(inputDisplay);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                cursorPosition = preCaretRange.toString().length;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                isPowerMode ? exitPower() : calculate();
            }

            if (e.key === 'Escape') clearDisplay();

            return;
        }

        // External keyboard input
        if (/[0-9]/.test(e.key)) window.append(e.key);
        if (['+', '-', '*', '/'].includes(e.key)) window.append(e.key);
        if (e.key === '^') window.append('**');

        if (e.key === 'Enter') {
            e.preventDefault();
            isPowerMode ? exitPower() : calculate();
        }

        if (e.key === 'Backspace') backspace();
        if (e.key === 'Escape') clearDisplay();
    });

    // Initial render
    render();
});