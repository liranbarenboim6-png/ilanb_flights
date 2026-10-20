<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {ArrowLeft, Menu, X} from '@lucide/vue';
import BrandMark from './components/BrandMark.vue';
import {emulatorMode, configured} from './lib/firebase';

const route = useRoute();
const menu = ref(false);
const navigation = ref<HTMLElement>();
const menuButton = ref<HTMLButtonElement>();
const isAdmin = computed(() => route.path.startsWith('/admin'));
watch(() => route.fullPath, () => { menu.value = false; });
async function toggleMenu() {
  menu.value = !menu.value;
  if (menu.value) {
    await nextTick();
    navigation.value?.querySelector<HTMLAnchorElement>('a')?.focus();
  }
}
function closeMenu() {
  if (!menu.value) return;
  menu.value = false;
  menuButton.value?.focus();
}
</script>

<template>
  <a class="skip-link" href="#main-content">דילוג לתוכן הראשי</a>
  <div v-if="emulatorMode" class="environment-notice">סביבת הדגמה מקומית · נתונים פיקטיביים בלבד · אין להזין מידע אמיתי</div>
  <div v-else-if="!configured" class="environment-notice">הגדרת Firebase נדרשת לפני שליחת דיווחים או כניסת צוות</div>
  <header v-if="!isAdmin" class="site-header" @keydown.esc="closeMenu">
    <div class="container header-inner">
      <RouterLink to="/" class="brand" aria-label="ארגון צרכני התעופה בישראל — עמוד הבית">
        <BrandMark class="brand-symbol" />
        <span class="brand-copy"><strong>ארגון צרכני<br />התעופה בישראל</strong></span>
      </RouterLink>
      <nav id="main-navigation" ref="navigation" class="site-nav" :class="{'is-open': menu}" aria-label="ניווט ראשי" @click="menu = false">
        <RouterLink to="/purpose">על הארגון</RouterLink>
        <RouterLink to="/#how-it-works">איך זה עובד</RouterLink>
        <RouterLink to="/report" class="mobile-report-link">להגשת דיווח</RouterLink>
      </nav>
      <RouterLink to="/report" class="btn btn-primary header-cta">דווחו לנו <ArrowLeft :size="20" aria-hidden="true" /></RouterLink>
      <button ref="menuButton" class="menu-toggle" type="button" :aria-label="menu ? 'סגירת תפריט' : 'פתיחת תפריט'" :aria-expanded="menu" aria-controls="main-navigation" @click="toggleMenu"><X v-if="menu" aria-hidden="true" /><Menu v-else aria-hidden="true" /></button>
    </div>
  </header>
  <RouterView />
  <footer v-if="!isAdmin" class="site-footer">
    <div class="container">
      <div class="footer-main">
        <nav class="footer-nav" aria-label="ניווט תחתון"><RouterLink to="/purpose">על הארגון</RouterLink><RouterLink to="/#how-it-works">איך זה עובד</RouterLink><RouterLink to="/contact">יצירת קשר</RouterLink></nav>
        <RouterLink class="brand footer-brand" to="/" aria-label="ארגון צרכני התעופה בישראל — עמוד הבית"><BrandMark class="brand-symbol" /><span class="brand-copy"><strong>ארגון צרכני<br />התעופה בישראל</strong></span></RouterLink>
      </div>
      <div class="footer-bottom">
        <span>© {{new Date().getFullYear()}} ארגון צרכני התעופה בישראל</span>
        <nav aria-label="מידע נוסף"><RouterLink to="/privacy">פרטיות</RouterLink><RouterLink to="/terms">תנאי שימוש</RouterLink><RouterLink to="/accessibility">נגישות</RouterLink><RouterLink to="/privacy/contact">פנייה בנושא פרטיות</RouterLink><RouterLink to="/admin/login">כניסת צוות</RouterLink></nav>
      </div>
      <p class="footer-note">הגשת דיווח אינה מבטיחה טיפול פרטני, ייצוג משפטי או פיצוי.</p>
    </div>
  </footer>
</template>
