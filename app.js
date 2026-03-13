import { loadTournamentsFromServer } from './js/api/api.js'
import { renderUserHome } from './js/pages/userhome.js'
import { state } from './js/core/state.js'
import { openModal,getTournament,playerLogin,showAdminForm,backToChoose,doAdminLogin} from './js/tournamentcontroller.js'
import { logout,goPage } from './js/core/navigation.js'
 

// expose functions for HTML onclick
window.playerLogin = playerLogin
window.showAdminForm = showAdminForm
window.backToChoose = backToChoose
window.doAdminLogin = doAdminLogin
window.goPage = goPage
window.openModal = openModal
window.closeModal = closeModal
window.logout = logout
window.getTournament = getTournament

export async function init(){

  await loadTournamentsFromServer()

  if(state.page === "user-home"){
      renderUserHome()
  }
}

init()