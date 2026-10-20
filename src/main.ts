import {createApp} from 'vue';
import {createRouter,createWebHistory} from 'vue-router';
import App from './App.vue';
import HomeView from './views/HomeView.vue';
import ReportView from './views/ReportView.vue';
import LoginView from './views/LoginView.vue';
import AdminView from './views/AdminView.vue';
import LegalView from './views/LegalView.vue';
import './style.css';
const router=createRouter({history:createWebHistory(),scrollBehavior(to){return to.hash?{el:to.hash,top:132}:{top:0};},routes:[
 {path:'/',component:HomeView},{path:'/report',component:ReportView},{path:'/admin/login',component:LoginView},
 {path:'/admin/:pathMatch(.*)*',component:AdminView},{path:'/:page(privacy|terms|purpose|contact|accessibility)',component:LegalView},
 {path:'/privacy/contact',component:LegalView},{path:'/:pathMatch(.*)*',component:LegalView}
]});
createApp(App).use(router).mount('#app');
