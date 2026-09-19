let boxes = document.querySelectorAll('.box');
let resetBtn = document.querySelector('#reset-button');
let newGameBtn = document.querySelector('#new-button');
let msgContainer = document.querySelector('.msg-container');
let msg = document.querySelector('#msg');
let counter = 0;

let turnO = true;

let winPatterns = [
    [0,1,2],
    [0,3,6],
    [0,4,8],
    [1,4,7],
    [2,5,8],
    [2,4,6],
    [3,4,5],
    [6,7,8]
]


const resetGame = () => {
    turnO = true;
    enableBoxes();
    msgContainer.classList.add('hide');
    counter = 0

}

boxes.forEach((box)=>{
    box.addEventListener("click",() =>{
        counter += 1
        if (turnO){
            box.innerText = 'O';
            box.setAttribute('style','color:blue;')
            turnO = false
        } else {
            box.innerText = 'X';
            box.setAttribute('style','color:orange;')
            turnO = true
        }
        box.disabled = true;

        if (counter == 9){
            showDraw();
        }
        checkWinner();
    })
})

const showDraw = () => {
    msg.innerText = 'Game is Draw. Try Again'
    msgContainer.classList.remove('hide');
    disableBoxes();
}

const disableBoxes = () =>{
    for (let box of boxes){
        box.disabled = true;
    }
}

const enableBoxes = () =>{
    for (let box of boxes){
        box.disabled = false;
        box.innerText = "";
    }
}

const showWinner = (winner) => {
    msg.innerText = `Congratulations, Winner is ${winner}`;
    msgContainer.classList.remove('hide');
    disableBoxes();
}

const checkWinner = () => {
    for (let pattern of winPatterns){
        let pos1Val = boxes[pattern[0]].innerText;
        let pos2Val = boxes[pattern[1]].innerText;
        let pos3Val = boxes[pattern[2]].innerText;
        
        if (pos1Val != "" && pos2Val != "" && pos3Val != ""){
            if (pos1Val == pos2Val && pos2Val == pos3Val){
                showWinner(pos1Val);
            }
        }
    }
}

newGameBtn.addEventListener('click',resetGame);
resetBtn.addEventListener('click',resetGame);