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
	let powerSectionEnd = -1;  // Track where power section should end

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
       RENDER FUNCTION - FIXED
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

            // Power mode start - IMPROVED
            if (!inPowerSection && expression.substring(i, i + 2) === "**") {
                inPowerSection = true;
                powerDepth = 0;
                
                html += `<span style="color:red; font-size:0.8em; vertical-align:super;">^</span>`;
                
                i += 2;
                
                // Check if there's a bracket after **
                if (i < expression.length && expression[i] === '(') {
                    html += `<span style="color:red;">(</span>`;
                    powerDepth = 1;
                    i++;
                }
                continue;
            }

            // Handle power content - FIXED: Only until operator
            if (inPowerSection) {
                // Check if we should exit power section
                if (powerDepth === 0 && /[\+\-\*\/]/.test(expression[i]) && i > 0) {
                    inPowerSection = false;
                    // Process this character normally
                } else {
                    if (expression[i] === "(") {
                        powerDepth++;
                        html += `<span style="color:red;">(</span>`;
                    }
                    else if (expression[i] === ")") {
                        powerDepth--;
                        html += `<span style="color:red;">)</span>`;
                        if (powerDepth === 0) {
                            i++;
                            continue;
                        }
                    }
                    else {
                        html += `<span style="color:red;">${expression[i]}</span>`;
                    }
                    i++;
                    continue;
                }
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
                // FIX: Don't convert * to × if it's part of **
                let displayChar;
                if (char === "*") {
                    // Check if this is part of ** (even if not in power section now)
                    if (i + 1 < expression.length && expression[i + 1] === "*") {
                        // It's part of ** - skip both stars
                        i += 2; // Skip both * characters
                        continue; // Move to next iteration
                    } else {
                        // It's a single * (multiplication operator)
                        displayChar = "×";
                    }
                } else if (char === "/") {
                    displayChar = "÷";
                } else {
                    displayChar = char;
                }

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
        const selection = window.getSelection();
        selection.removeAllRanges();
        
        if (pos === 0) {
            const range = document.createRange();
            range.setStart(inputDisplay, 0);
            range.collapse(true);
            selection.addRange(range);
            inputDisplay.focus();
            return;
        }
        
        // Improved method to handle spans and text nodes
        const walker = document.createTreeWalker(
            inputDisplay,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let charCount = 0;
        let targetNode = null;
        let targetOffset = 0;
        let found = false;
        
        let node;
        while (node = walker.nextNode()) {
            const textLength = node.textContent.length;
            
            if (charCount + textLength >= pos) {
                targetNode = node;
                targetOffset = pos - charCount;
                found = true;
                break;
            }
            charCount += textLength;
        }
        
        if (found && targetNode) {
            const range = document.createRange();
            range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
            range.collapse(true);
            selection.addRange(range);
        } else {
            // Fallback: set cursor at end
            const range = document.createRange();
            range.selectNodeContents(inputDisplay);
            range.collapse(false);
            selection.addRange(range);
        }
        
        inputDisplay.focus();
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

        // 3. POWER BUTTON HANDLING - FIXED
        if (value === '**') {
            if (isPowerMode) {
                // If already in power mode, exit it
                isPowerMode = false;
                powerStartIndex = -1;
                render();
                return;
            }
            
            if (cursorPosition === 0) return;
            
            // Check if cursor is between two numbers (like in "25")
            let leftNum = '';
            let i = cursorPosition - 1;
            while (i >= 0 && /[0-9]/.test(expression[i])) {
                leftNum = expression[i] + leftNum;
                i--;
            }
            
            let rightNum = '';
            let j = cursorPosition;
            while (j < expression.length && /[0-9]/.test(expression[j])) {
                rightNum += expression[j];
                j++;
            }
            
            // If we're between numbers, split them
            if (leftNum !== '' && rightNum !== '') {
                // Keep the right number for power value
                // Just insert ** between left and right numbers
                expression = expression.slice(0, cursorPosition) + "**" + expression.slice(cursorPosition);
                cursorPosition += 2;
                isPowerMode = true;
                powerStartIndex = cursorPosition - 2;
                render();
                return;
            }
            if (!/[0-9)]/.test(charBeforeCursor)) return;
            
            // Start power mode
            isPowerMode = true;
            powerStartIndex = cursorPosition;
            
            // Add ** at cursor position (WITHOUT AUTO BRACKET)
            expression = expression.slice(0, cursorPosition) + "**" + expression.slice(cursorPosition);
            cursorPosition += 2;
            
            render();
            return;
        }

        // 4. IF IN POWER MODE AND USER PRESSES OPERATOR, EXIT POWER MODE
        if (isPowerMode && ['+', '-', '*', '/'].includes(value)) {
            // Exit power mode first
            isPowerMode = false;
            powerStartIndex = -1;
            
            // Then add the operator
            expression = expression.slice(0, cursorPosition) + value + expression.slice(cursorPosition);
            cursorPosition += value.length;
            render();
            return;
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

        // Handle multiplication insertion before brackets/numbers - FIXED
        if ((value === "(" || value === "√") &&
            cursorPosition > 0 && /[0-9)]/.test(charBeforeCursor)) {
            // Only add * if we're NOT inserting √ in power mode
            if (!(value === "√" && isPowerMode)) {
                expression = expression.slice(0, cursorPosition) + "*" + expression.slice(cursorPosition);
                cursorPosition++;
            }
        }

        // Infsert value at cursor position
        expression = expression.slice(0, cursorPosition) + value + expression.slice(cursorPosition);
        cursorPosition += value.length;
        
        render();
    };

       /* ===============================
       POWER MODE EXIT
    =============================== */
    window.exitPower = function () {
        if (!isPowerMode) return;
        
        isPowerMode = false;
        powerStartIndex = -1;
        
        // Fix cursor position after exiting power mode
        // Ensure cursor is at the end of the power section
        if (expression.includes("**")) {
            let lastPowerPos = expression.lastIndexOf("**");
            if (lastPowerPos !== -1) {
                // Find end of power section
                let endPos = lastPowerPos + 2;
                while (endPos < expression.length && !/[\+\-\*\/]/.test(expression[endPos])) {
                    endPos++;
                }
                cursorPosition = endPos;
            }
        }
        
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
       CALCULATE FUNCTION - FIXED FOR SQUARE ROOT
    =============================== */
    window.calculate = function () {
        if (expression === "") return;
        if (isPowerMode) exitPower();

        let tempExpr = expression;

        // FIX FOR SQUARE ROOT: Handle nested square roots
        // First, count all √ characters
        let sqrtCount = 0;
        for (let char of tempExpr) {
            if (char === '√') sqrtCount++;
        }
        
        // Replace each √ with Math.sqrt(
        for (let s = 0; s < sqrtCount; s++) {
            tempExpr = tempExpr.replace('√', 'Math.sqrt(');
        }
        
        // Add closing brackets for all Math.sqrt(
        for (let s = 0; s < sqrtCount; s++) {
            // Find the position of Math.sqrt(
            let sqrtPos = tempExpr.indexOf('Math.sqrt(');
            if (sqrtPos === -1) break;
            
            // Find where to put closing bracket
            let j = sqrtPos + 10; // After "Math.sqrt("
            let bracketDepth = 0;
            
            while (j < tempExpr.length) {
                if (tempExpr[j] === '(') bracketDepth++;
                else if (tempExpr[j] === ')') {
                    if (bracketDepth === 0) break;
                    bracketDepth--;
                }
                else if (bracketDepth === 0 && /[\+\-\*\/]/.test(tempExpr[j])) {
                    break;
                }
                j++;
            }
            
            // Insert closing bracket
            tempExpr = tempExpr.slice(0, j) + ")" + tempExpr.slice(j);
        }

        // Count brackets - ORIGINAL LOGIC RESTORED
        let openB  = (tempExpr.match(/\(/g) || []).length;
        let closeB = (tempExpr.match(/\)/g) || []).length;
        
        // Agar brackets missing hain to notification show karo
        if (openB > closeB) {
            // Sirf agar √ nahi hai aur brackets missing hain tab error dikhao
            if (!tempExpr.includes("Math.sqrt(")) {
                showResultMessage("Close bracket");
                return;
            }
            // √ hai to automatically closing brackets add karo
            tempExpr += ")".repeat(openB - closeB);
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
            powerStartIndex = -1;
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
    window.backspace = function (e) {
        if (e) e.preventDefault();
        
        inputDisplay.focus();
        
        if (justCalculated) {
            justCalculated = false;
            resultDisplay.style.opacity = "0.5";
            resultDisplay.innerText = "";
            cursorPosition = expression.length;
            render();
            return;
        }
        
        if (cursorPosition > 0) {
            // Check if deleting ** operator
            if (cursorPosition >= 2 && expression.substring(cursorPosition - 2, cursorPosition) === "**") {
                expression = expression.slice(0, cursorPosition - 2) + expression.slice(cursorPosition);
                cursorPosition -= 2;
                isPowerMode = false;
                powerStartIndex = -1;
            } 
            else if (expression[cursorPosition - 1] === '√') {
                expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
                cursorPosition--;
            }
            else {
                // Check if we're deleting from inside power section
                let deletingFromPowerSection = false;
                if (isPowerMode && cursorPosition > powerStartIndex) {
                    deletingFromPowerSection = true;
                }
                
                expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
                cursorPosition--;
                
                // Check if we deleted the entire power section
                if (deletingFromPowerSection && cursorPosition <= powerStartIndex) {
                    isPowerMode = false;
                    powerStartIndex = -1;
                }
                
                // Check if we're still in power mode but ** is gone
                if (isPowerMode && !expression.includes("**")) {
                    isPowerMode = false;
                    powerStartIndex = -1;
                }
            }
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