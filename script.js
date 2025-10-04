// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, Timestamp, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase and App State variables
let app, db, auth;
let userId = null;
let appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
let isFirestoreReady = false; // New flag to track Firestore readiness
let quizQuestions = []; // Array to hold the shuffled questions for the current round

// Quiz State
const MAX_TIME = 60; // seconds
const TOTAL_QUESTIONS_TO_ASK = 5; // The number of questions to ask per round
let currentQuestionIndex = 0;
let score = 0;
let timeLeft = MAX_TIME;
let timerInterval = null;
let quizStartTime = null;

// UI Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const quizStatus = document.getElementById('quiz-status');
const questionText = document.getElementById('question-text');
const choicesContainer = document.getElementById('choices-container');
const progressBar = document.getElementById('progress-bar');
const timerDisplay = document.getElementById('timer');
const nextButton = document.getElementById('next-button');
const resultMessage = document.getElementById('result-message');
const timeTakenDisplay = document.getElementById('time-taken');
const saveStatus = document.getElementById('save-status');
const authStatus = document.getElementById('auth-status');

// Full Quiz Data (50 questions for variety)
const ALL_QUESTIONS = [
    {
        question: "What is the capital city of Australia?",
        choices: ["Sydney", "Melbourne", "Canberra", "Perth"],
        correctAnswer: "Canberra"
    },
    {
        question: "Which planet is known as the 'Red Planet'?",
        choices: ["Jupiter", "Mars", "Venus", "Saturn"],
        correctAnswer: "Mars"
    },
    {
        question: "In computing, what does 'RAM' stand for?",
        choices: ["Read Access Memory", "Random Access Memory", "Realtime Application Management", "Remote Access Module"],
        correctAnswer: "Random Access Memory"
    },
    {
        question: "What is the chemical symbol for gold?",
        choices: ["Ag", "Au", "Fe", "Pb"],
        correctAnswer: "Au"
    },
    {
        question: "Who wrote the play 'Romeo and Juliet'?",
        choices: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        correctAnswer: "William Shakespeare"
    },
    {
        question: "What geometric shape is generally used for a stop sign?",
        choices: ["Square", "Circle", "Octagon", "Triangle"],
        correctAnswer: "Octagon"
    },
    {
        question: "What is the largest ocean on Earth?",
        choices: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correctAnswer: "Pacific Ocean"
    },
    {
        question: "Which of the following elements is a noble gas?",
        choices: ["Oxygen", "Nitrogen", "Argon", "Carbon"],
        correctAnswer: "Argon"
    },
    {
        question: "What is the longest river in the world?",
        choices: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
        correctAnswer: "Nile River"
    },
    {
        question: "What year did the Titanic sink?",
        choices: ["1910", "1912", "1914", "1916"],
        correctAnswer: "1912"
    },
    {
        question: "How many legs does a spider have?",
        choices: ["Six", "Eight", "Ten", "Twelve"],
        correctAnswer: "Eight"
    },
    {
        question: "Which famous scientist developed the theory of relativity?",
        choices: ["Isaac Newton", "Galileo Galilei", "Albert Einstein", "Nikola Tesla"],
        correctAnswer: "Albert Einstein"
    },
    {
        question: "The process by which plants make their food is called what?",
        choices: ["Respiration", "Transpiration", "Photosynthesis", "Germination"],
        correctAnswer: "Photosynthesis"
    },
    {
        question: "In which country would you find the city of Machu Picchu?",
        choices: ["Mexico", "Peru", "Chile", "Brazil"],
        correctAnswer: "Peru"
    },
    {
        question: "What is the chemical symbol for table salt?",
        choices: ["KCl", "H2O", "CO2", "NaCl"],
        correctAnswer: "NaCl"
    },
    {
        question: "What is the smallest country in the world?",
        choices: ["Monaco", "Nauru", "Vatican City", "San Marino"],
        correctAnswer: "Vatican City"
    },
    {
        question: "Which bone in the human body is the longest?",
        choices: ["Tibia", "Humerus", "Femur", "Fibula"],
        correctAnswer: "Femur"
    },
    {
        question: "What is the main ingredient in guacamole?",
        choices: ["Tomato", "Onion", "Avocado", "Lime"],
        correctAnswer: "Avocado"
    },
    {
        question: "What does HTML stand for?",
        choices: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyperlink and Text Management Language", "Home Tool Markup Language"],
        correctAnswer: "Hyper Text Markup Language"
    },
    {
        question: "Who painted the Mona Lisa?",
        choices: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
        correctAnswer: "Leonardo da Vinci"
    },
    {
        question: "What is the boiling point of water in Celsius?",
        choices: ["90°C", "100°C", "110°C", "0°C"],
        correctAnswer: "100°C"
    },
    {
        question: "How many continents are there?",
        choices: ["Five", "Six", "Seven", "Eight"],
        correctAnswer: "Seven"
    },
    {
        question: "Which animal is the largest mammal in the world?",
        choices: ["Elephant", "Giraffe", "Blue Whale", "Great White Shark"],
        correctAnswer: "Blue Whale"
    },
    {
        question: "What is the currency of Japan?",
        choices: ["Yuan", "Won", "Yen", "Ringgit"],
        correctAnswer: "Yen"
    },
    {
        question: "What is the highest mountain peak in Africa?",
        choices: ["Mount Everest", "Mount Kilimanjaro", "Mount Denali", "Mount Fuji"],
        correctAnswer: "Mount Kilimanjaro"
    },
    {
        question: "The Earth is located in which galaxy?",
        choices: ["Andromeda", "Triangulum", "Pinwheel", "Milky Way"],
        correctAnswer: "Milky Way"
    },
    {
        question: "Which country consumes the most chocolate per capita?",
        choices: ["USA", "Switzerland", "Belgium", "Germany"],
        correctAnswer: "Switzerland"
    },
    {
        question: "What is a group of crows called?",
        choices: ["A herd", "A flock", "A murder", "A colony"],
        correctAnswer: "A murder"
    },
    {
        question: "What is the primary function of red blood cells?",
        choices: ["Fighting infection", "Clotting blood", "Transporting oxygen", "Producing antibodies"],
        correctAnswer: "Transporting oxygen"
    },
    {
        question: "In what year did the first manned moon landing occur?",
        choices: ["1965", "1969", "1971", "1975"],
        correctAnswer: "1969"
    },
    {
        question: "Who is generally credited with inventing the printing press?",
        choices: ["William Caxton", "Johannes Gutenberg", "Galileo Galilei", "Leonardo da Vinci"],
        correctAnswer: "Johannes Gutenberg"
    },
    {
        question: "What is the hardest natural substance on Earth?",
        choices: ["Quartz", "Granite", "Iron", "Diamond"],
        correctAnswer: "Diamond"
    },
    {
        question: "Which Roman emperor made Christianity the state religion?",
        choices: ["Nero", "Augustus", "Constantine the Great", "Diocletian"],
        correctAnswer: "Constantine the Great"
    },
    {
        question: "What is the name of the currency used in Russia?",
        choices: ["Euro", "Ruble", "Lira", "Krona"],
        correctAnswer: "Ruble"
    },
    {
        question: "What atmospheric layer contains the ozone layer?",
        choices: ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"],
        correctAnswer: "Stratosphere"
    },
    {
        question: "Which city hosts the annual running of the bulls festival?",
        choices: ["Madrid", "Seville", "Pamplona", "Barcelona"],
        correctAnswer: "Pamplona"
    },
    {
        question: "How many strings does a standard guitar have?",
        choices: ["Four", "Five", "Six", "Seven"],
        correctAnswer: "Six"
    },
    {
        question: "What is the square root of 144?",
        choices: ["10", "11", "12", "13"],
        correctAnswer: "12"
    },
    {
        question: "Which famous physicist proposed the laws of motion and universal gravitation?",
        choices: ["Stephen Hawking", "Isaac Newton", "Max Planck", "Niels Bohr"],
        correctAnswer: "Isaac Newton"
    },
    {
        question: "What is the collective noun for a group of lions?",
        choices: ["A pack", "A pride", "A herd", "A gaggle"],
        correctAnswer: "A pride"
    },
    {
        question: "Which country is the largest producer of coffee in the world?",
        choices: ["Colombia", "Vietnam", "Brazil", "Ethiopia"],
        correctAnswer: "Brazil"
    },
    {
        question: "What is the main component of the sun?",
        choices: ["Oxygen", "Iron", "Helium", "Hydrogen"],
        correctAnswer: "Hydrogen"
    },
    {
        question: "What does the 'www' stand for in a website browser?",
        choices: ["World Wide Web", "World Word Windows", "Web World War", "Wide Web Works"],
        correctAnswer: "World Wide Web"
    },
    {
        question: "In the human body, where is the patella located?",
        choices: ["Elbow", "Shoulder", "Knee", "Ankle"],
        correctAnswer: "Knee"
    },
    {
        question: "Which ocean borders the west coast of North America?",
        choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
        correctAnswer: "Pacific"
    },
    {
        question: "What type of star is the Sun?",
        choices: ["Red Giant", "White Dwarf", "Yellow Dwarf", "Neutron Star"],
        correctAnswer: "Yellow Dwarf"
    },
    {
        question: "Which city hosted the 2016 Summer Olympics?",
        choices: ["London", "Beijing", "Rio de Janeiro", "Tokyo"],
        correctAnswer: "Rio de Janeiro"
    },
    {
        question: "The chemical formula for water is?",
        choices: ["CO2", "H2SO4", "NaCl", "H2O"],
        correctAnswer: "H2O"
    },
    {
        question: "Which fictional consulting detective lives at 221B Baker Street?",
        choices: ["Hercule Poirot", "Sherlock Holmes", "Miss Marple", "Auguste Dupin"],
        correctAnswer: "Sherlock Holmes"
    },
    {
        question: "The period known as the 'Dark Ages' generally refers to the decline of which empire?",
        choices: ["Ottoman Empire", "Roman Empire", "British Empire", "Egyptian Empire"],
        correctAnswer: "Roman Empire"
    }
];

// --- Utility Functions ---

/**
 * Custom display for errors instead of alert().
 * @param {string} title - The title of the error.
 * @param {string} message - The detailed error message.
 */
function displayError(title, message) {
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-box').classList.remove('hidden');
    console.error(title, message);
}

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} The shuffled array.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Firebase/Auth/Data Functions ---

/**
 * Initializes Firebase and authenticates the user.
 */
async function initFirebase() {
    document.getElementById('app-id-display').textContent = `App ID: ${appId}`;

    let firebaseConfig;
    try {
        // Check if the configuration variable is available and non-empty
        const configString = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
        firebaseConfig = JSON.parse(configString);
        
        if (Object.keys(firebaseConfig).length === 0) {
            throw new Error("Missing config");
        }
    } catch (e) {
        // Configuration is missing or invalid. Set flag and update status.
        isFirestoreReady = false;
        authStatus.textContent = `Warning: Score saving disabled. Firebase config missing.`;
        userId = crypto.randomUUID(); // Ensure a user ID for non-persistent local use
        return; 
    }

    try {
        // setLogLevel('Debug'); // Enable for debugging

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Handle authentication state
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                isFirestoreReady = true;
                authStatus.textContent = `Session ready (User ID: ${userId.substring(0, 8)}...)`;
            } else {
                // Attempt to sign in if not already authenticated
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (e) {
                    displayError("Authentication Failed", `Could not sign in: ${e.message}`);
                    userId = crypto.randomUUID(); // Fallback to a random ID
                    isFirestoreReady = false;
                    authStatus.textContent = `Session failed. Using fallback ID: ${userId.substring(0, 8)}... (Saving disabled)`;
                }
            }
        });

    } catch (e) {
        // If initialization fails for other reasons (e.g., network error)
        isFirestoreReady = false;
        displayError("Initialization Error", `Failed to initialize Firebase: ${e.message}. Saving disabled.`);
        authStatus.textContent = `Session failed. (Saving disabled)`;
    }
}

/**
 * Saves the final score to Firestore.
 * @param {number} finalScore - The score achieved.
 * @param {number} timeTaken - The time taken in seconds.
 */
async function saveScore(finalScore, timeTaken) {
    if (!isFirestoreReady || !userId || !db) {
        saveStatus.textContent = "Skipped (Saving Disabled)";
        return;
    }

    saveStatus.textContent = "Saving...";
    

    const dataToSave = {
        score: finalScore,
        timeTakenSeconds: timeTaken,
        maxTimeSeconds: MAX_TIME,
        totalQuestions: TOTAL_QUESTIONS_TO_ASK,
        timestamp: Timestamp.now(),
        userId: userId,
        appId: appId
    };

    try {
        // Collection path: /artifacts/{appId}/users/{userId}/quiz_scores
        const userScoresCollection = collection(db, 'artifacts', appId, 'users', userId, 'quiz_scores');
        
        // Use the timestamp as part of the document ID for unique records
        const docId = `quiz-result-${Date.now()}`;
        const docRef = doc(userScoresCollection, docId);

        await setDoc(docRef, dataToSave);
        saveStatus.textContent = `Success! (${docId.substring(12)}...)`;
    } catch (e) {
        displayError("Save Failed", `Could not save score to Firestore: ${e.message}`);
        saveStatus.textContent = `Failed to save score.`;
    }
}

// --- Quiz Logic Functions ---

/**
 * Displays the current question and its choices.
 */
function displayQuestion() {
    // Use the shuffled quizQuestions array
    if (currentQuestionIndex >= quizQuestions.length) {
        endQuiz();
        return;
    }

    // Clear previous choices and hide the next button
    choicesContainer.innerHTML = '';
    // FIX: Ensure the button is set to hidden and disabled state when a new question loads
    nextButton.classList.add('hidden', 'opacity-0', 'pointer-events-none');
    nextButton.classList.remove('pointer-events-auto');
    nextButton.disabled = true;

    const q = quizQuestions[currentQuestionIndex];
    
    // Update question text and progress
    questionText.textContent = q.question;
    document.getElementById('question-progress').textContent = `Question ${currentQuestionIndex + 1} of ${TOTAL_QUESTIONS_TO_ASK}`;
    const progress = (currentQuestionIndex / TOTAL_QUESTIONS_TO_ASK) * 100;
    progressBar.style.width = `${progress}%`;

    // Shuffle choices before displaying
    const shuffledChoices = shuffleArray([...q.choices]);

    // Create choice buttons
    shuffledChoices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice;
        button.classList.add(
            'choice-btn',
            'w-full', 'p-4', 'text-left', 'bg-gray-100', 'text-gray-800', 
            'font-medium', 'rounded-lg', 'shadow-sm', 'transition', 
            'duration-200', 'hover:bg-indigo-100', 'focus:ring-2', 
            'focus:ring-indigo-500', 'focus:outline-none'
        );
        button.onclick = () => selectAnswer(button, choice, q.correctAnswer);
        choicesContainer.appendChild(button);
    });

    // Re-enable pointer events on the container
    choicesContainer.classList.remove('pointer-events-none-on-select');
}

/**
 * Handles the user's answer selection.
 * @param {HTMLElement} selectedButton - The button element clicked.
 * @param {string} selectedChoice - The text of the selected choice.
 * @param {string} correctAnswer - The correct answer text.
 */
function selectAnswer(selectedButton, selectedChoice, correctAnswer) {
    // Prevent further clicks on choices
    choicesContainer.classList.add('pointer-events-none-on-select');
    
    // Highlight buttons
    const isCorrect = selectedChoice === correctAnswer;
    const allChoiceButtons = document.querySelectorAll('.choice-btn');

    allChoiceButtons.forEach(btn => {
        btn.classList.remove('hover:bg-indigo-100'); // Remove hover effect
        
        if (btn.textContent === correctAnswer) {
            // Correct answer
            btn.classList.remove('bg-gray-100');
            btn.classList.add('bg-green-100', 'border-2', 'border-green-500', 'text-green-800');
        } else if (btn === selectedButton) {
            // Incorrect selected answer
            btn.classList.remove('bg-gray-100');
            btn.classList.add('bg-red-100', 'border-2', 'border-red-500', 'text-red-800');
        } else {
            // Unselected wrong answer
            btn.classList.remove('bg-gray-100');
            btn.classList.add('bg-gray-200', 'text-gray-500', 'opacity-75');
        }
        btn.disabled = true; // Disable all buttons
    });

    if (isCorrect) {
        score++;
    }

    // Show the next button
    nextButton.textContent = currentQuestionIndex < TOTAL_QUESTIONS_TO_ASK - 1 ? "Next Question" : "Finish Quiz";
    // FIX: Remove 'hidden' class to make the button visible
    nextButton.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    nextButton.classList.add('opacity-100', 'pointer-events-auto');
    nextButton.disabled = false;
}

/**
 * Updates the timer display and ends the quiz if time runs out.
 */
function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = `${timeLeft}s`;

    if (timeLeft <= 10) {
        timerDisplay.classList.add('text-red-600', 'animate-pulse');
    } else {
        timerDisplay.classList.remove('text-red-600', 'animate-pulse');
    }

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        endQuiz(true); // End due to timeout
    }
}

/**
 * Starts the quiz state and UI.
 */
function startQuiz() {
    // 1. Shuffle the entire question bank (50 questions).
    const shuffledQuestions = shuffleArray([...ALL_QUESTIONS]);
    // 2. Select the first 5 questions for this round. This ensures the set of 5 is unique and random.
    quizQuestions = shuffledQuestions.slice(0, TOTAL_QUESTIONS_TO_ASK);
    
    // Reset state
    currentQuestionIndex = 0;
    score = 0;
    timeLeft = MAX_TIME;
    quizStartTime = Date.now();
    saveStatus.textContent = isFirestoreReady ? "Waiting..." : "Saving Disabled";

    // Update UI
    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    quizStatus.classList.remove('hidden');

    timerDisplay.textContent = `${MAX_TIME}s`;
    nextButton.onclick = nextQuestion;

    // Start timer
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    // Display the first question
    displayQuestion();
}

/**
 * Moves to the next question or ends the quiz.
 */
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < TOTAL_QUESTIONS_TO_ASK) {
        displayQuestion();
    } else {
        endQuiz();
    }
}

/**
 * Ends the quiz, stops the timer, and shows results.
 * @param {boolean} [timedOut=false] - Whether the quiz ended due to timeout.
 */
function endQuiz(timedOut = false) {
    clearInterval(timerInterval);
    
    const timeElapsed = MAX_TIME - timeLeft;
    const finalScore = score;
    const completionMessage = timedOut 
        ? "Time's up! You finished the quiz." 
        : "Great job! You finished all the questions.";
    
    const performanceText = finalScore === TOTAL_QUESTIONS_TO_ASK 
        ? "Perfect score! Outstanding work."
        : finalScore >= TOTAL_QUESTIONS_TO_ASK / 2 
        ? "Well done! A solid performance."
        : "Keep practicing! You can do even better.";

    resultMessage.innerHTML = `${completionMessage}<br><span class="text-indigo-600 font-bold text-4xl">${finalScore}/${TOTAL_QUESTIONS_TO_ASK}</span> correct.<br>${performanceText}`;
    timeTakenDisplay.textContent = `${timeElapsed}s`;

    // Save the score
    saveScore(finalScore, timeElapsed);

    // Update UI
    quizScreen.classList.add('hidden');
    quizStatus.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    progressBar.style.width = `100%`; // Progress bar is full upon completion
}

// --- Event Listeners and Initialization ---

// Attach event listeners
document.getElementById('start-button').addEventListener('click', startQuiz);
document.getElementById('restart-button').addEventListener('click', startQuiz);

// Initialize Firebase and Auth on load
window.onload = initFirebase;
