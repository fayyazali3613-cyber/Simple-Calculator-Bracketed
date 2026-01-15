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

            // Square root
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
        
        if (justCalculated) {
            if (['+', '-', '*', '/', '**'].includes(value)) {
                expression = lastAnswer;
                cursorPosition = expression.length;
                justCalculated = false;
                
                expression += value;
                cursorPosition = expression.length;
                render();
                return;
            } else if (!['√'].includes(value)) {
                expression = "";
                cursorPosition = 0;
                justCalculated = false;
                isPowerMode = false;
            }
        }

        let charBeforeCursor = cursorPosition > 0 ? expression[cursorPosition - 1] : '';
        let lastChar = expression.slice(-1);

        if (value === ")") {
            let openBrackets = (expression.match(/\(/g) || []).length;
            let closeBrackets = (expression.match(/\)/g) || []).length;
            
            if (closeBrackets >= openBrackets) {
                showResultMessage("Invalid closing");
                return;
            }
            
            if (cursorPosition > 0) {
                if (['+', '-', '*', '/'].includes(charBeforeCursor)) {
                    if (cursorPosition >= 2) {
                        let twoCharsBefore = expression.slice(cursorPosition - 2, cursorPosition);
                        if (twoCharsBefore === "(+" || twoCharsBefore === "(*" || 
                            twoCharsBefore === "(/" || twoCharsBefore === "(-") {
                            expression = expression.slice(0, cursorPosition - 1) + ")" + expression.slice(cursorPosition);
                            render();
                            return;
                        }
                    }
                    
                    let hasValidContentBefore = false;
                    for (let i = cursorPosition - 2; i >= 0; i--) {
                        if (/[0-9)]/.test(expression[i])) {
                            hasValidContentBefore = true;
                            break;
                        }
                        if (expression[i] === '(') break;
                    }
                    
                    if (!hasValidContentBefore) {
                        expression = expression.slice(0, cursorPosition - 1) + ")" + expression.slice(cursorPosition);
                        render();
                        return;
                    }
                }
            }
        }

        if (value === '(') {
        } else if (charBeforeCursor === '(') {
            if (!/[0-9\-]/.test(value) && value !== '√' && value !== '(') {
                showResultMessage("Invalid after (");
                return;
            }
        }

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

        if (isPowerMode && !['0','1','2','3','4','5','6','7','8','9','+','-','*','/','(',')','.','√'].includes(value)) {
            if (/[0-9]/.test(value)) {
                showResultMessage("Enter operator");
                return;
            }
        }

        if (/[0-9.]/.test(value) && cursorPosition > 0) {
            let charAtPos = expression[cursorPosition - 1];
            if (charAtPos === ')' || (isPowerMode && charBeforeCursor === ')')) {
                showResultMessage("Enter operator");
                return;
            }
        }

        if (['+', '*', '/'].includes(value) && cursorPosition > 0) {
            if (cursorPosition >= 2) {
                let twoCharsBefore = expression.slice(cursorPosition - 2, cursorPosition);
                if (twoCharsBefore === "(-") {
                    showResultMessage("Invalid after (");
                    return;
                }
            }
        }

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

        if (cursorPosition === 0 && ['+', '*', '/'].includes(value)) return;
        
        if (charBeforeCursor === "(" && ['+', '*', '/'].includes(value)) {
            showResultMessage("Invalid after (");
            return;
        }

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

        if ((value === "(" || value === "√") && 
            cursorPosition > 0 && /[0-9)]/.test(charBeforeCursor)) {
            expression = expression.slice(0, cursorPosition) + "*" + expression.slice(cursorPosition);
            cursorPosition++;
        }

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
       SPECIAL FUNCTIONS
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

        // FIX 1: √ KO PROPERLY CONVERT KARO
        // Pehle har √ ko properly Math.sqrt() mein convert karo
        let convertedExpr = "";
        let i = 0;
        
        while (i < tempExpr.length) {
            if (tempExpr[i] === '√') {
                convertedExpr += "Math.sqrt(";
                i++;
                
                // √ ke baad kya hai?
                if (i < tempExpr.length && tempExpr[i] === '(') {
                    // √( case - bracket ki depth count karo
                    let depth = 1;
                    convertedExpr += "(";
                    i++;
                    
                    while (i < tempExpr.length && depth > 0) {
                        if (tempExpr[i] === '(') depth++;
                        if (tempExpr[i] === ')') depth--;
                        convertedExpr += tempExpr[i];
                        i++;
                    }
                    // Math.sqrt ke liye closing bracket add karo
                    convertedExpr += ")";
                } else {
                    // √ ke baad direct number/expression
                    // Sab kuch lelo jab tak operator, bracket ya end na aaye
                    let content = "";
                    while (i < tempExpr.length && !['+', '-', '*', '/', ')', '√', '^'].includes(tempExpr[i])) {
                        content += tempExpr[i];
                        i++;
                    }
                    convertedExpr += content + ")";
                }
            } else if (tempExpr.substring(i, i + 3) === "**(") {
                // FIX 2: POWER MODE HANDLING
                convertedExpr += "**(";
                i += 3;
                let depth = 1;
                
                while (i < tempExpr.length && depth > 0) {
                    if (tempExpr[i] === '(') depth++;
                    if (tempExpr[i] === ')') depth--;
                    convertedExpr += tempExpr[i];
                    i++;
                }
            } else {
                convertedExpr += tempExpr[i];
                i++;
            }
        }
        
        tempExpr = convertedExpr;

        // FIX 3: MISSING BRACKETS CHECK AND FIX
        let openBrackets = (tempExpr.match(/\(/g) || []).length;
        let closeBrackets = (tempExpr.match(/\)/g) || []).length;
        
        // Agar Math.sqrt ke liye brackets missing hain
        let sqrtCount = (tempExpr.match(/Math\.sqrt\(/g) || []).length;
        if (sqrtCount > 0) {
            // Har Math.sqrt ke liye check karo
            let finalExpr = "";
            let pos = 0;
            
            while (pos < tempExpr.length) {
                if (tempExpr.substring(pos, pos + 10) === "Math.sqrt(") {
                    finalExpr += "Math.sqrt(";
                    pos += 10;
                    
                    let depth = 1;
                    let foundClosing = false;
                    let tempPos = pos;
                    
                    // Closing bracket dhoondo
                    while (tempPos < tempExpr.length && depth > 0) {
                        if (tempExpr[tempPos] === '(') depth++;
                        if (tempExpr[tempPos] === ')') depth--;
                        tempPos++;
                    }
                    
                    if (depth === 0) {
                        // Closing bracket mil gayi
                        while (pos < tempPos) {
                            finalExpr += tempExpr[pos];
                            pos++;
                        }
                    } else {
                        // Closing bracket nahi mili, add karo
                        while (pos < tempExpr.length && !['+', '-', '*', '/', ')'].includes(tempExpr[pos])) {
                            finalExpr += tempExpr[pos];
                            pos++;
                        }
                        finalExpr += ")";
                    }
                } else {
                    finalExpr += tempExpr[pos];
                    pos++;
                }
            }
            
            tempExpr = finalExpr;
        }

        // General brackets check
        openBrackets = (tempExpr.match(/\(/g) || []).length;
        closeBrackets = (tempExpr.match(/\)/g) || []).length;
        
        if (openBrackets > closeBrackets) {
            tempExpr += ")".repeat(openBrackets - closeBrackets);
        }

        // Remove trailing operators
        while (['+', '-', '*', '/'].includes(tempExpr.slice(-1))) {
            tempExpr = tempExpr.slice(0, -1);
        }

        try {
            // FIX 4: FINAL VALIDATION
            // Ensure all Math.sqrt have closing brackets
            let testExpr = tempExpr;
            let sqrtMatches = testExpr.match(/Math\.sqrt\(/g);
            if (sqrtMatches) {
                for (let j = 0; j < sqrtMatches.length; j++) {
                    let sqrtIndex = testExpr.indexOf("Math.sqrt(");
                    if (sqrtIndex === -1) break;
                    
                    let afterSqrt = testExpr.substring(sqrtIndex + 10);
                    let depth = 1;
                    let k = 0;
                    
                    while (k < afterSqrt.length && depth > 0) {
                        if (afterSqrt[k] === '(') depth++;
                        if (afterSqrt[k] === ')') depth--;
                        k++;
                    }
                    
                    if (depth > 0) {
                        // Missing closing bracket, add it
                        testExpr += ")";
                    }
                }
            }
            
            tempExpr = testExpr;
            
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
            console.error("Calculation error:", error, "Expression:", tempExpr);
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
        } else if (cursorPosition > 0 && expression[cursorPosition - 1] === '√') {
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

    render();
});