const webAppUrl = "https://script.google.com/macros/s/AKfycbwsOFNCCu7hbKkvV0hIH7pCDh4_Me6A_NQg8KCSuMeb2NkO6rRUQJY_qEJ-h34vhSg9/exec"; // Replace with your Apps Script Web App URL

let questions = [], currentQuestion = 0, userAnswers = {}, timer, timeLeft;
let userEmail, userName, joinCode, score = 0, startTime;


function formatTime(sec){
  let h = Math.floor(sec / 3600);
  let m = Math.floor((sec % 3600) / 60);
  let s = sec % 60;
  let str = "";
  if(h>0) str += h + " hr ";
  if(m>0) str += m + " min ";
  if(s>0 || str==="") str += s + " sec";
  return str.trim();
}


function formatTimeTaken(){
  return formatTime(Math.floor((new Date() - startTime)/1000));
}


function startQuiz(){
  userName = document.getElementById("name").value.trim();
  userEmail = document.getElementById("email").value.trim();
  joinCode = document.getElementById("joinCode").value.trim();
  if(!userName || !userEmail || !joinCode){ alert("All fields mandatory!"); return; }

  fetch(`${webAppUrl}?action=getQuestions&joinCode=${joinCode}`)
    .then(r => r.json())
    .then(data => {
      if(!data.success){ alert("Invalid Join Code!"); return; }
      questions = data.questions;
      timeLeft = data.duration;
      startTime = new Date();
      document.getElementById("login-container").style.display = "none";
      document.getElementById("quiz-container").style.display = "block";
      loadQuestion();
      startTimer();
    });
}

function startTimer(){
  timer = setInterval(()=>{
    timeLeft--;
    let timeEl = document.getElementById("time-left");
    if(timeEl) timeEl.textContent = formatTime(timeLeft);
    if(timeLeft <= 0){ clearInterval(timer); timeOver(); }
  },1000);
}

function loadQuestion(){
  let q = questions[currentQuestion];
  let html = `<div id="quiz-header">
                <span>${currentQuestion+1} of ${questions.length}</span>
                <span>Time Left: <span id="time-left">${formatTime(timeLeft)}</span></span>
              </div>
              <h3 style="font-size:28px; margin:20px 0;">${q.Question}</h3>`;

  if(q.Type==="MCQ"){
    q.Options.forEach((opt,i)=>{
      html += `<div class="option ${userAnswers[currentQuestion]==i?'selected':''}" onclick="selectOption(${i},false)">${opt}</div>`;
    });
  } else if(q.Type==="Multiple"){
    q.Options.forEach((opt,i)=>{
      let selected = (userAnswers[currentQuestion]||[]).includes(i);
      html += `<div class="option ${selected?'selected':''}" onclick="toggleCheckbox(${i},event)">
                 <input type="checkbox" ${selected?'checked':''}>${opt}
               </div>`;
    });
  } else if(q.Type==="Fill"){
    let val = userAnswers[currentQuestion]||"";
    html += `<input type="text" placeholder="Type your answer here" value="${val}" oninput="userAnswers[currentQuestion]=this.value" style="font-size:22px; padding:10px; width:50%; margin-top:15px;">`;
  }

  html += "<br>";
  if(currentQuestion>0) html += `<button onclick="prevQuestion()">Previous</button>`;
  if(currentQuestion<questions.length-1) html += `<button onclick="nextQuestion()">Next</button>`;
  html += `<button onclick="reviewQuiz()">Submit</button>`;

  document.getElementById("quiz-container").innerHTML = html;
}

function selectOption(i,multi){
  if(multi){
    if(!userAnswers[currentQuestion]) userAnswers[currentQuestion]=[];
    if(userAnswers[currentQuestion].includes(i)){
      userAnswers[currentQuestion]=userAnswers[currentQuestion].filter(x=>x!==i);
    } else { userAnswers[currentQuestion].push(i); }
  } else {
    userAnswers[currentQuestion]=i;
  }
  loadQuestion();
}

function toggleCheckbox(i,event){
  event.stopPropagation(); 
  if(!userAnswers[currentQuestion]) userAnswers[currentQuestion]=[];
  
  if(userAnswers[currentQuestion].includes(i)){
    userAnswers[currentQuestion]=userAnswers[currentQuestion].filter(x=>x!==i);
  } else {
    userAnswers[currentQuestion].push(i);
  }
  loadQuestion(); 
}


function prevQuestion(){ currentQuestion--; loadQuestion(); }
function nextQuestion(){ currentQuestion++; loadQuestion(); }


function reviewQuiz(){
  let html = `<h2 style="margin-bottom:20px;">Review Your Answers</h2>`;
  questions.forEach((q,i)=>{
    let attempted = false;
    if(q.Type==="Fill" && userAnswers[i]?.trim()!=="") attempted = true;
    else if(q.Type==="MCQ" && userAnswers[i]!==undefined) attempted = true;
    else if(q.Type==="Multiple" && userAnswers[i]?.length>0) attempted = true;

    html += `<div class="circle ${attempted?'attempted':'not-attempted'}" onclick="jumpTo(${i})">${i+1}</div>`;
  });
  html += `<br><br><button onclick="finishQuiz()">Finish</button>`;
  document.getElementById("quiz-container").innerHTML = html;
}

function jumpTo(i){ currentQuestion=i; loadQuestion(); }

function finishQuiz(){
  clearInterval(timer);
  document.getElementById("quiz-container").innerHTML=`<h2 style="color:green;">Quiz Completed</h2>`;
  calculateScore("Completed");
}

function timeOver(){
  document.getElementById("quiz-container").innerHTML=`<h2 style="color:red;">You are Eliminated</h2>`;
  calculateScore("Eliminated");
}

function calculateScore(status){
  score = 0;
  questions.forEach((q,i)=>{
    if(q.Type==="MCQ" && userAnswers[i]===q.Correct) score++;
    if(q.Type==="Multiple" && JSON.stringify(userAnswers[i])===JSON.stringify(q.Correct)) score++;
    if(q.Type==="Fill" && userAnswers[i]?.trim().toLowerCase()===q.Correct.toLowerCase()) score++;
  });

  let payload = {
    action: "submitResults",
    name: userName,
    email: userEmail,
    joinCode: joinCode,
    score: score,
    timeTaken: formatTimeTaken(),
    status: status
  };

  fetch(webAppUrl,{
    method: "POST",
    body: JSON.stringify(payload)
  });
}
