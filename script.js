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


    // ADD THIS - ONLY FOR BASIC OPERATORS
    const operatorColors = {
        '+': '#2196F3', // Blue
        '-': '#2196F3', // Blue
        '×': '#FF9800', // Orange
        '÷': '#FF9800', // Orange
    };

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
	let lastExpression = ""; // ← YE NAYA VARIABLE ADD KARO	
	let lastButtonPressed = ""; // Track last pressed button
let consecutiveButtonPresses = 0; // Track consecutive presse

	// Data save karne ke liye function
	function saveToStorage() {
		try {
			if (lastAnswer) {
				localStorage.setItem('calculator_lastAnswer', lastAnswer);
			}
			if (lastExpression) {
				localStorage.setItem('calculator_lastExpression', lastExpression);
			}
			
			// Debugging ke liye
			console.log("Saved to storage:");
			console.log("Last Answer:", lastAnswer);
			console.log("Last Expression:", lastExpression);
		} catch (e) {
			console.error("Error saving to localStorage:", e);
		}
	}


	/* ===============================
   PERSISTENT STORAGE - LOAD FROM LOCALSTORAGE
=============================== */
// Application load hone par data load karo
function loadFromStorage() {
    try {
        lastAnswer = localStorage.getItem('calculator_lastAnswer') || "";
        lastExpression = localStorage.getItem('calculator_lastExpression') || "";
        
        // Debugging ke liye
        console.log("Loaded from storage:");
        console.log("Last Answer:", lastAnswer);
        console.log("Last Expression:", lastExpression);
    } catch (e) {
        console.error("Error loading from localStorage:", e);
    }
}


    /* ===============================
       EDITABLE INPUT LOGIC
    =============================== */

        inputDisplay.addEventListener("input", function () {
            isManualEditing = true; 
            
            let manualText = inputDisplay.innerText;
            // Remove commas and convert display characters back to expression format
            expression = manualText
                .replace(/,/g, '') // Remove commas first
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
        RENDER FUNCTION - FIXED WITH COMMA FORMATTING AND POWER COLOR
        =============================== */

        function render() {
    if (isManualEditing) {
        isManualEditing = false;
        return;
    }

    // Store current scroll position before rendering
	const shouldScrollToEnd = cursorPosition >= expression.length;
    const previousScrollLeft = inputDisplay.scrollLeft;
    const wasScrolledToEnd = Math.abs(inputDisplay.scrollLeft - (inputDisplay.scrollWidth - inputDisplay.clientWidth)) < 10;

    let html = "";
    let stack = [];
    let i = 0;
    let inPowerSection = false;
    let powerDepth = 0;
    let currentNumber = ""; // To accumulate number characters
    let inNumber = false; // Track if we're inside a number

    while (i < expression.length) {
        let char = expression[i];

        // Check if character is part of a number
        const isDigitOrDecimal = /[0-9.]/.test(char);
        
        // Power mode start - IMPROVED
        if (!inPowerSection && expression.substring(i, i + 2) === "**") {
            // If we were in a number, format it before handling power
            if (inNumber && currentNumber !== "") {
                html += `<span class="char">${formatNumberWithCommas(currentNumber)}</span>`;
                currentNumber = "";
                inNumber = false;
            }
            
            inPowerSection = true;
            powerDepth = 0;
            
            html += `<span class="power-symbol">^</span>`;
            
            i += 2;
            
            // Check if there's a bracket after **
            if (i < expression.length && expression[i] === '(') {
                html += `<span class="power-red">(</span>`;
                powerDepth = 1;
                i++;
            }
            continue;
        }

        // Handle power content - FIXED: Keep red color for power section
        if (inPowerSection) {
            // If we're entering a number in power section
            if (isDigitOrDecimal) {
                currentNumber += char;
                inNumber = true;
                i++;
                continue;
            } else if (inNumber && currentNumber !== "") {
                // Format the number we collected in power section WITH RED COLOR
                const formattedNumber = formatNumberWithCommas(currentNumber);
                html += `<span style="color:red;">${formattedNumber}</span>`;
                currentNumber = "";
                inNumber = false;
                // Continue to process the current character
            }
            
            // Check if we should exit power section
            if (powerDepth === 0 && /[\+\-\*\/]/.test(expression[i]) && i > 0) {
                inPowerSection = false;
                // Process this character normally
            } else {
                if (expression[i] === "(") {
                    powerDepth++;
                    html += `<span class="power-red">(</span>`;

                }
                else if (expression[i] === ")") {
                    powerDepth--;
                    html += `<span style="color:red;">)</span>`;
                    if (powerDepth === 0) {
                        i++;
                        continue;
                    }
                }
                else if (expression[i] === '√') {
                    // Square root in power section
                    html += `<span style="color:red;font-weight:900;transform:scale(1.2,1.1)">√</span>`;
                }
                else {
                    // Any other character in power section (operators, etc.)
                    html += `<span style="color:red;">${char}</span>`;
                }
                i++;
                continue;
            }
        }

        // Square root (outside power section)
        if (expression[i] === '√') {
            // If we were in a number, format it before square root
            if (inNumber && currentNumber !== "") {
                html += `<span class="char">${formatNumberWithCommas(currentNumber)}</span>`;
                currentNumber = "";
                inNumber = false;
            }
            
            html += `<span style="color:red;font-weight:900;transform:scale(1.2,1.1)">√</span>`;
            i++;
            continue;
        }

        // Start or continue a number (outside power section)
        if (isDigitOrDecimal) {
            currentNumber += char;
            inNumber = true;
            i++;
            continue;
        }
        
        // If we were in a number and now encounter non-number character
        if (inNumber && currentNumber !== "") {
            // Format number with commas (normal numbers, not in power section)
            html += `<span class="char">${formatNumberWithCommas(currentNumber)}</span>`;
            currentNumber = "";
            inNumber = false;
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

            // CHECK FOR OPERATOR COLORS
            const specialColor = operatorColors[displayChar];
            if (specialColor) {
                // Apply color for +, -, ×, ÷ operators
                html += `<span style="color:${specialColor}">${displayChar}</span>`;
            } else {
                // Default display for everything else
                html += `<span class="char">${displayChar}</span>`;
            }
        }

        i++;
    }
    
    // Last number ko bhi format karo agar bacha ho
    if (inNumber && currentNumber !== "") {
        if (inPowerSection) {
            // Power section mein red color ke sath
            html += `<span style="color:red;">${formatNumberWithCommas(currentNumber)}</span>`;
        } else {
            // Normal numbers
            html += `<span class="char">${formatNumberWithCommas(currentNumber)}</span>`;
        }
    }

    const wasFocused = document.activeElement === inputDisplay;
    
    inputDisplay.innerHTML = html;

    if (wasFocused && html.length > 0) {
        setTimeout(() => {
            setCursorPosition(cursorPosition);
        }, 10);
    }

    // Restore scroll position intelligently
    setTimeout(() => {
		if (wasScrolledToEnd || justCalculated || shouldScrollToEnd) {
			// If user was at the end or just calculated, scroll to end
			inputDisplay.scrollLeft = inputDisplay.scrollWidth;
		} else {
			// Otherwise, try to maintain the relative scroll position
			inputDisplay.scrollLeft = previousScrollLeft;
            
            // Adjust if cursor is outside visible area
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const displayRect = inputDisplay.getBoundingClientRect();
                
                // If cursor is not visible, adjust scroll
                if (rect.left < displayRect.left || rect.right > displayRect.right) {
                    inputDisplay.scrollLeft += (rect.left - displayRect.left - 20);
                }
            }
        }
        
        // For result display, always scroll to end
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
	   NEW: LAST EXPRESSION FUNCTION
	=============================== */

	/* ===============================
	NEW: LAST EXPRESSION FUNCTION
	=============================== */

	window.useLastExpression = function () {
		// Agar same button consecutive press ho raha hai
		if (lastButtonPressed === "lastExp") {
			consecutiveButtonPresses++;
		} else {
			consecutiveButtonPresses = 1;
			lastButtonPressed = "lastExp";
		}
		
		// Agar doosri consecutive press hai
		if (consecutiveButtonPresses >= 2) {
			showResultMessage("Enter operator");
			return;
		}
		
		if (lastExpression) {
			inputDisplay.focus();
			
			// Check if we should clear current expression
			if (justCalculated || expression === "") {
				expression = lastExpression;
				cursorPosition = expression.length;
				justCalculated = false;
			} else {
				// Check if last character is a number or closing bracket
				let lastChar = expression.slice(-1);
				if (/[0-9)]/.test(lastChar)) {
					showResultMessage("Enter operator");
					consecutiveButtonPresses = 2; // Force next press to show message
					return;
				}
				
				// Append to current expression
				expression = expression.slice(0, cursorPosition) + lastExpression + expression.slice(cursorPosition);
				cursorPosition += lastExpression.length;
			}
			
			// Data ko update karo aur save karo
			saveToStorage();
			render();
		} else {
			// Agar koi last expression nahi hai, to message show karo
			showResultMessage("No previous expression");
		}
	};

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

// NEW FUNCTION: Format number with commas (handles HTML spans)
function formatNumberWithCommas(numStr) {
    // Agar string empty hai to return karo
    if (!numStr) return '';
    
    // Agar already HTML span hai to usko as-is return karo
    if (numStr.includes('<span') || numStr.includes('</span>')) {
        return numStr;
    }
    
    // Agar decimal hai to integer aur decimal parts alag karo
    if (numStr.includes('.')) {
        const parts = numStr.split('.');
        const intPart = parts[0];
        const decPart = parts[1];
        
        // Format integer part
        let formattedInt = '';
        let count = 0;
        const isNegative = intPart.startsWith('-');
        const intStr = isNegative ? intPart.substring(1) : intPart;
        
        for (let i = intStr.length - 1; i >= 0; i--) {
            if (count > 0 && count % 3 === 0) {
                formattedInt = ',' + formattedInt;
            }
            formattedInt = intStr[i] + formattedInt;
            count++;
        }
        
        if (isNegative) {
            formattedInt = '-' + formattedInt;
        }
        
        return formattedInt + '.' + decPart;
    }
    
    // Integer number format karo
    let formatted = '';
    let count = 0;
    const isNegative = numStr.startsWith('-');
    const numStrClean = isNegative ? numStr.substring(1) : numStr;
    
    for (let i = numStrClean.length - 1; i >= 0; i--) {
        if (count > 0 && count % 3 === 0) {
            formatted = ',' + formatted;
        }
        formatted = numStrClean[i] + formatted;
        count++;
    }
    
    if (isNegative) {
        formatted = '-' + formatted;
    }
    
    return formatted;
}

        // NEW FUNCTION: Format integer part with commas
        function formatIntegerWithCommas(intStr) {
            // Remove any existing commas
            intStr = intStr.replace(/,/g, '');
            
            // Handle negative numbers
            const isNegative = intStr.startsWith('-');
            if (isNegative) {
                intStr = intStr.substring(1);
            }
            
            // Add commas every 3 digits from right
            let formatted = '';
            let count = 0;
            
            for (let i = intStr.length - 1; i >= 0; i--) {
                if (count > 0 && count % 3 === 0) {
                    formatted = ',' + formatted;
                }
                formatted = intStr[i] + formatted;
                count++;
            }
            
            return (isNegative ? '-' : '') + formatted;
        }

        // NEW FUNCTION: Extract and format numbers in expression
        function formatExpressionWithCommas(expr) {
            // Expression ko parts mein todte hain: numbers, operators, brackets, etc.
            let result = '';
            let currentNumber = '';
            
            for (let i = 0; i < expr.length; i++) {
                const char = expr[i];
                
                // Check if character is part of a number (digit or decimal point)
                if (/[0-9.]/.test(char)) {
                    currentNumber += char;
                } else {
                    // If we have accumulated a number, format it
                    if (currentNumber !== '') {
                        result += formatNumberWithCommas(currentNumber);
                        currentNumber = '';
                    }
                    // Add the non-number character
                    result += char;
                }
            }
            
            // Last number ko bhi format karo
            if (currentNumber !== '') {
                result += formatNumberWithCommas(currentNumber);
            }
            
            return result;
        }

        // NEW FUNCTION: Remove commas from expression for calculation
        function removeCommasFromExpression(expr) {
            return expr.replace(/,/g, '');
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


    /* ===============================
       APPEND & INPUT HANDLING
    =============================== */
    window.append = function (value) {
		
		consecutiveButtonPresses = 0;
		lastButtonPressed = "";
		
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

	/* ===============================
	   LAST ANSWER FUNCTION
	=============================== */
	/* ===============================
   LAST ANSWER FUNCTION
=============================== */
	window.useAns = function () {
		// Agar same button consecutive press ho raha hai
		if (lastButtonPressed === "lastAns") {
			consecutiveButtonPresses++;
		} else {
			consecutiveButtonPresses = 1;
			lastButtonPressed = "lastAns";
		}
		
		// Agar doosri consecutive press hai
		if (consecutiveButtonPresses >= 2) {
			showResultMessage("Enter operator");
			return;
		}
		
		if (lastAnswer) {
			inputDisplay.focus();
			cursorPosition = expression.length;
			
			// Check if last character is a number or closing bracket
			let lastChar = expression.slice(-1);
			if (cursorPosition > 0 && /[0-9)]/.test(lastChar)) {
				showResultMessage("Enter operator");
				consecutiveButtonPresses = 2; // Force next press to show message
				return;
			}
			
			// Data ko update karo aur save karo
			saveToStorage();
			window.append(lastAnswer);
		} else {
			// Agar koi last answer nahi hai, to message show karo
			showResultMessage("No previous answer");
		}
	};

    window.toggleTheme = function () {
        document.body.classList.toggle("light-mode");
    };

	/* ===============================
	   CALCULATE FUNCTION - FIXED FOR SQUARE ROOT WITH COMMA FORMATTING
		=============================== */
	window.calculate = function () {
		if (expression === "") return;
		if (isPowerMode) exitPower();
		
		// Save current expression before calculation
		lastExpression = expression; // ← YE LINE ADD KARO

		// Remove commas from expression before calculation
		let tempExpr = removeCommasFromExpression(expression);

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

			// Format result with commas
			let resultStr = result.toString();
			let formattedResult = formatNumberWithCommas(resultStr);
			
			resultDisplay.innerText = formattedResult;
			lastAnswer = resultStr; // Store without commas for future calculations
			justCalculated = true;
			
			cursorPosition = expression.length;
			isPowerMode = false;
			powerStartIndex = -1;
			saveToStorage();
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
    
    // Reset consecutive presses
    consecutiveButtonPresses = 0;
    lastButtonPressed = "";
    
    if (cursorPosition > 0) {
        // Check if we're trying to delete power value (number after **)
        if (cursorPosition >= 3 && 
            expression.substring(cursorPosition - 3, cursorPosition - 1) === "**") {
            // User is trying to delete power value, not power operator
            // Just delete one character normally
            expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            cursorPosition--;
        } 
        // Check if deleting power operator
        else if (cursorPosition >= 2 && expression.substring(cursorPosition - 2, cursorPosition) === "**") {
            expression = expression.slice(0, cursorPosition - 2) + expression.slice(cursorPosition);
            cursorPosition -= 2;
            isPowerMode = false;
            powerStartIndex = -1;
        } else if (expression[cursorPosition - 1] === '√') {
            expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            cursorPosition--;
        } else {
            expression = expression.slice(0, cursorPosition - 1) + expression.slice(cursorPosition);
            cursorPosition--;
            // Reset power mode if we deleted something inside it
            if (isPowerMode && cursorPosition < powerStartIndex) {
                isPowerMode = false;
                powerStartIndex = -1;
            }
        }
        
        render();
    }
	};

	window.clearDisplay = function () {
		// Reset consecutive presses
		consecutiveButtonPresses = 0;
		lastButtonPressed = "";
		
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
    // Keyboard support
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

    // Initial render se PEHLE load karo
    loadFromStorage();
    
    // Initial render
    render();
    
    // Page unload hone par bhi save karo
    window.addEventListener('beforeunload', saveToStorage);
    
    // Simple touch feedback for all calculator buttons
    document.querySelectorAll('.calc-btn, .special-btn, button').forEach(btn => {
        // Touch start (finger press)
        btn.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.92)';
            this.style.opacity = '0.9';
            this.style.transition = 'transform 0.1s, opacity 0.1s';
        });
        
        // Touch end (finger release)
        btn.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
            this.style.opacity = '1';
        });
        
        // Touch cancel (finger slide away)
        btn.addEventListener('touchcancel', function() {
            this.style.transform = 'scale(1)';
            this.style.opacity = '1';
        });
        
        // Mouse events for desktop testing
        btn.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.92)';
            this.style.opacity = '0.9';
        });
        
        btn.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
            this.style.opacity = '1';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.opacity = '1';
        });
    });
    
}); // document.addEventListener ka end