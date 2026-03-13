
import{renderAdminHome} from '../pages/adminhome.js'
import { renderUserHome } from '../pages/userhome.js';

export function renderPage(page) {
    if(page==='user-home') renderUserHome();
    else if(page==='admin-home') renderAdminHome();
    else if(page==='new-tournament') renderNewTournament();
    else if(page==='resolve') renderResolve();
    else if(page==='preview') renderPreview();
    else if(page==='tournament') renderTournamentContent();
  }
  
export function deleteTournament(id){

if(!confirm("Delete this tournament?")) return;

// Try server delete first, fallback locally
(async()=>{
  try{
    const res = await apiDeleteTournament(id);
    if(res && res.status === 'success'){
      state.tournaments = state.tournaments.filter(t => t.id !== id);
      renderAdminHome();
      return;
    }
  } catch(e){}
  // fallback
  state.tournaments = state.tournaments.filter(t => t.id !== id);
  try{ localStorage.setItem("fantasy_tournaments", JSON.stringify(state.tournaments)); }catch(e){}
  renderAdminHome();
})();

}

