<script setup lang="ts">
import {ref,computed} from 'vue';import {useRoute} from 'vue-router';import {Plane,ArrowUpLeft,Menu,ShieldCheck} from '@lucide/vue';
import {emulatorMode,configured} from './lib/firebase';
const route=useRoute();const menu=ref(false);const isAdmin=computed(()=>route.path.startsWith('/admin'));
</script>
<template>
 <a class="skip-link" href="#main-content">דילוג לתוכן הראשי</a>
 <div v-if="emulatorMode" class="environment-notice">סביבת הדגמה מקומית · Firebase Emulator · נתונים פיקטיביים בלבד · אין להזין מידע אמיתי</div>
 <div v-else-if="!configured" class="environment-notice">הגדרת Firebase נדרשת לפני שליחת דיווחים או כניסת צוות</div>
 <template v-if="!isAdmin">
 <header class="site-header"><div class="container header-inner">
  <RouterLink to="/" class="brand"><span class="brand-symbol"><Plane :size="32"/></span><span class="brand-copy"><strong>ארגון צרכני התעופה</strong><small>בישראל · מחברים מקרים. מזהים דפוסים.</small></span></RouterLink>
  <nav class="site-nav" :class="{'is-open':menu}" aria-label="ניווט ראשי" @click="menu=false"><RouterLink to="/#how-it-works">איך זה עובד</RouterLink><RouterLink to="/#areas">תחומי הדיווח</RouterLink><RouterLink to="/#about">על המיזם</RouterLink><RouterLink to="/#faq">שאלות ותשובות</RouterLink></nav>
  <RouterLink to="/report" class="btn btn-primary header-cta">להגשת דיווח <ArrowUpLeft :size="17"/></RouterLink><button class="menu-toggle" aria-label="תפריט" :aria-expanded="menu" @click="menu=!menu"><Menu/></button>
 </div></header>
 </template>
 <RouterView/>
 <footer v-if="!isAdmin" class="site-footer"><div class="container"><div class="footer-top"><div><RouterLink class="brand brand-inverse" to="/"><span class="brand-symbol"><Plane :size="30"/></span><span class="brand-copy"><strong>ארגון צרכני התעופה בישראל</strong><small>הקול שלכם. הזכויות של כולנו.</small></span></RouterLink><p>מערכת לאיסוף דיווחים בתחומי התעופה והתיירות. המידע מסייע לבחינת תופעות צרכניות.</p></div><div><h3>לקריאה נוספת</h3><RouterLink to="/purpose">מטרת הדיווח</RouterLink><RouterLink to="/contact">יצירת קשר</RouterLink><RouterLink to="/admin/login">כניסת צוות</RouterLink></div><div><h3>פרטיות ושימוש</h3><RouterLink to="/privacy">הודעת פרטיות</RouterLink><RouterLink to="/terms">תנאי שימוש</RouterLink><RouterLink to="/privacy/contact">פנייה בנושא פרטיות</RouterLink><RouterLink to="/accessibility">נגישות</RouterLink></div><div class="footer-assurance"><ShieldCheck :size="28"/><h3>הפרטים שלכם נשארים פרטיים</h3><p>אין פרסום אוטומטי של דיווחים. גישה למידע למורשים בלבד.</p></div></div><div class="footer-bottom"><span>© {{new Date().getFullYear()}} ארגון צרכני התעופה בישראל</span><p>הגשת דיווח אינה מבטיחה טיפול פרטני, ייצוג משפטי או פיצוי.</p></div></div></footer>
</template>
