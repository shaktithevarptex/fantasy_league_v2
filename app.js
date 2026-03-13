import { loadTournamentsFromServer } from './js/api/api.js'
import { renderUserHome } from './features/tournament/leaderboard.js'
import { state } from './js/core/state.js'

import { playerLogin} from './js/tournamentcontroller.js'
import { goPage } from './js/core/navigation.js'
import { openModal, closeModal } from './features/modal/modal.js'

// expose functions for HTML onclick
window.playerLogin = playerLogin
window.showAdminForm = showAdminForm
window.backToChoose = backToChoose
window.doAdminLogin = doAdminLogin
window.goPage = goPage
window.openModal = openModal
window.closeModal = closeModal

export async function init(){

  await loadTournamentsFromServer()

  if(state.page === "user-home"){
      renderUserHome()
  }

}

init()