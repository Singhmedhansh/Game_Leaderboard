import { createTournamentState } from './lib/rules.js'

(() => {
  const state = createTournamentState()
  const teams = state.teams || []
  const teamList = document.getElementById('teams')
  const addBtn = document.getElementById('addTeam')
  const teamNameIn = document.getElementById('teamName')
  const promptIn = document.getElementById('prompt')
  const applyPrompt = document.getElementById('applyPrompt')

  function render(){
    teamList.innerHTML = ''
    teams.sort((a,b)=>b.totalPoints - a.totalPoints)
    teams.forEach((t,idx)=>{
      const li = document.createElement('li')
      li.className = 'team'
      li.innerHTML = `<div class="left"><div class="meta"><strong>${escapeHtml(t.teamName||t.name)}</strong><div class="muted">${escapeHtml(t.leaderName||t.note||'')}</div></div></div><div class="right"><span class="score">${t.totalPoints||0}</span></div>`
      teamList.appendChild(li)
    })
  }

  function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  addBtn.addEventListener('click',()=>{
    const name = teamNameIn.value.trim()
    if(!name) return
    teams.push({teamName:name, totalPoints:0, leaderName:''})
    teamNameIn.value=''
    render()
  })

  applyPrompt.addEventListener('click',()=>{
    const v = promptIn.value.trim()
    if(!v) return alert('Paste a prompt or event name')
    if(teams.length) teams[0].note = v
    render()
  })

  render()

})()
