<script setup lang="ts">
import {ArrowLeft, Plane, Clock3, WalletCards, CreditCard, FilePenLine, UsersRound, Megaphone, ChevronDown, ChevronLeft} from '@lucide/vue';
const areas = [
  {title:'ביטול טיסה', icon:Plane, category:'cancellation', tone:'lime'},
  {title:'עיכוב בטיסה', icon:Clock3, category:'delay', tone:'mint'},
  {title:'החזרים כספיים', icon:WalletCards, category:'refund', tone:'mint'},
  {title:'חיובים ותשלומים', icon:CreditCard, category:'extra_charge', tone:'lime'},
];
const steps = [
  {number:'01', title:'משתפים', text:'מספרים לנו מה קרה', icon:FilePenLine},
  {number:'02', title:'מחברים', text:'מזהים מקרים דומים\nובוחנים דפוסים חוזרים', icon:UsersRound},
  {number:'03', title:'פועלים', text:'מקדמים שינוי מול\nהגורמים הרלוונטיים', icon:Megaphone},
];
const faqs = [
  {question:'על אילו מקרים אפשר לדווח?', answer:'אפשר לדווח על ביטול או עיכוב בטיסה, החזר שלא התקבל, חיובים נוספים ובעיות בהזמנה מול חברות תעופה וסוכנויות נסיעות. בטופס אפשר לבחור את הנושא המתאים ולספר לנו מה קרה.'},
  {question:'מה קורה אחרי שליחת הדיווח?', answer:'הדיווח מתקבל לעיון של צוות מורשה. אנחנו בוחנים את המידע ומחברים בין מקרים דומים כדי לזהות תופעות צרכניות ולבחון דרכי פעולה. אם תסכימו לכך, נוכל ליצור עמכם קשר לצורך הטיפול בדיווח. הגשת הדיווח אינה מבטיחה טיפול פרטני, ייצוג או פיצוי.'},
  {question:'האם הדיווח עולה כסף והאם צריך לצרף מסמכים?', answer:'הגשת הדיווח היא ללא עלות. הארגון אינו מקבל קבצים או מסמכים משום סוג; כל מה שצריך הוא למלא את פרטי המקרה בטופס.'},
];
</script>

<template>
  <main id="main-content" class="flight-home">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="container hero-inner">
        <div class="home-hero-copy">
          <p class="home-eyebrow">ארגון צרכני התעופה בישראל</p>
          <h1 id="home-title" class="home-title">הטיסה הסתבכה?<br>אנחנו איתכם.</h1>
          <p class="home-intro">ביטול, עיכוב או החזר שלא הגיע —<br> משתפים אותנו. פועלים יחד.</p>
          <RouterLink to="/report" class="btn btn-primary home-main-cta">משתפים במקרה שלי <ArrowLeft :size="24" aria-hidden="true"/></RouterLink>
          <p class="home-cta-note">ללא עלות · בכמה דקות</p>
        </div>
        <div class="home-hero-art" aria-hidden="true">
          <img src="/images/hero-luggage.webp" alt="" width="960" height="960" fetchpriority="high" decoding="async">
        </div>
      </div>
    </section>
    <section id="areas" class="container home-areas" aria-label="נושאים נפוצים לדיווח">
      <RouterLink v-for="area in areas" :key="area.category" :to="`/report?category=${area.category}`" class="home-area">
        <span class="home-area-icon" :class="area.tone"><component :is="area.icon" :size="34" :stroke-width="1.8" aria-hidden="true"/></span>
        <h2>{{area.title}}</h2>
      </RouterLink>
    </section>
    <section id="how-it-works" class="container home-process" aria-labelledby="process-title">
      <h2 id="process-title">מהסיפור שלכם מתחיל שינוי.</h2>
      <span class="home-heading-accent" aria-hidden="true"/>
      <ol class="home-steps">
        <li v-for="(step,index) in steps" :key="step.number" class="home-step">
          <div class="home-step-top"><span class="home-step-icon"><component :is="step.icon" :size="37" :stroke-width="1.7" aria-hidden="true"/></span><span class="home-step-number" aria-hidden="true">{{step.number}}</span></div>
          <h3>{{step.title}}</h3><p>{{step.text}}</p>
          <ChevronLeft v-if="index<steps.length-1" class="home-step-arrow" :size="26" :stroke-width="1.3" aria-hidden="true"/>
        </li>
      </ol>
    </section>
    <section id="about" class="container home-story" aria-labelledby="story-title">
      <img src="/images/flight-window.webp" alt="" aria-hidden="true" width="1536" height="640" loading="lazy" decoding="async">
      <div class="home-story-copy">
        <h2 id="story-title">יש לכם סיפור מהטיסה?</h2>
        <p>כל סיפור מחזק את הצרכנים ומקדם שינוי בענף התעופה.</p>
        <RouterLink to="/report" class="btn home-lime-cta">בואו נדבר <ArrowLeft :size="23" aria-hidden="true"/></RouterLink>
      </div>
    </section>
    <section id="faq" class="container home-faq" aria-labelledby="faq-title">
      <h2 id="faq-title">שאלות נפוצות</h2>
      <div class="home-faq-list">
        <details v-for="faq in faqs" :key="faq.question">
          <summary>{{faq.question}}<ChevronDown :size="21" aria-hidden="true"/></summary>
          <p>{{faq.answer}}</p>
        </details>
      </div>
      <p class="home-purpose-link">יחד מגנים על זכויות צרכני התעופה. <RouterLink to="/purpose">להיכרות עם הארגון <ArrowLeft :size="15" aria-hidden="true"/></RouterLink></p>
    </section>
  </main>
</template>

<style scoped>
.flight-home{background:var(--page,#fffefa);overflow:clip;color:var(--navy)}
.home-hero{padding:20px 0 18px}
.hero-inner{display:grid;grid-template-columns:1fr 1fr;align-items:center;min-height:540px;gap:8px}
.home-hero-copy{position:relative;z-index:1;padding:30px 0 34px}
.home-eyebrow{font-size:21px;font-weight:750;color:var(--teal);margin-bottom:15px}
.home-title{font-size:clamp(48px,5.7vw,76px);font-weight:800;line-height:1.08;letter-spacing:-.04em;white-space:nowrap}
.home-intro{font-size:28px;line-height:1.4;font-weight:450;margin:20px 0 25px}
.home-main-cta{min-width:340px;min-height:66px;font-size:24px;font-weight:750;gap:30px;border-radius:999px}
.home-cta-note{font-size:15px;margin-top:10px;text-align:center;max-width:340px;color:#33475c}
.home-hero-art{position:relative;aspect-ratio:1;min-width:0;isolation:isolate;margin-inline:-20px -10px}
.home-hero-art img{display:block;width:100%;height:100%;object-fit:contain;position:absolute;inset:0;mix-blend-mode:multiply;mask-image:linear-gradient(to right,transparent,#000 3%,#000 97%,transparent)}
.home-areas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;background:#eff8f3;border-radius:28px;padding:17px 21px;margin-top:0}
.home-area{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:150px;padding:10px 12px;background:#fffefa;border:1px solid transparent;border-radius:21px;transition:transform .18s,border-color .18s,box-shadow .18s}
.home-area:hover{transform:translateY(-3px);border-color:#9bcbc0;box-shadow:0 8px 20px #04324708}
.home-area-icon{display:grid;place-items:center;width:73px;height:73px;border-radius:50%;color:#08475c}
.home-area-icon.lime{background:linear-gradient(135deg,#e3fba8,#d9f69b)}
.home-area-icon.mint{background:linear-gradient(135deg,#d8f5ef,#d9f3f3)}
.home-area h2{font-size:25px;font-weight:800;letter-spacing:-.025em;text-align:center}
.home-process{text-align:center;padding-block:36px 34px}
.home-process>h2{font-size:45px;font-weight:800;letter-spacing:-.035em}
.home-heading-accent{display:block;height:6px;width:57px;margin:17px auto 24px;background:var(--lime,#d3fb77);border-radius:10px}
.home-steps{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;padding:0;margin:0}
.home-step{position:relative;padding:0 24px}
.home-step-top{display:flex;align-items:center;justify-content:center;gap:20px}
.home-step-icon{display:grid;place-items:center;width:80px;height:80px;border-radius:50%;color:#075967;background:linear-gradient(140deg,#ddf6ed,#d9f1ed)}
.home-step-number{font-size:51px;font-weight:700;line-height:1;color:#65b6a9;font-variant-numeric:tabular-nums;letter-spacing:-.04em;direction:ltr}
.home-step h3{font-size:28px;font-weight:800;margin:10px 0 3px}
.home-step p{font-size:21px;line-height:1.32;white-space:pre-line;color:#33475e}
.home-step-arrow{position:absolute;left:-27px;top:74px;color:#879ba5}
.home-story{position:relative;isolation:isolate;overflow:hidden;border-radius:34px;background:var(--navy);min-height:225px;margin-block:0 20px;color:#fff;display:flex;align-items:center;direction:ltr}
.home-story>img{position:absolute;z-index:-2;inset:0;height:100%;width:100%;object-fit:cover;object-position:center}
.home-story:after{content:'';position:absolute;z-index:-1;inset:0;background:linear-gradient(90deg,#032c43 0%,#032c43f2 36%,#032c4366 63%,transparent 85%)}
.home-story-copy{width:70%;padding:27px 42px;direction:rtl;text-align:left}
.home-story h2{font-size:44px;font-weight:800;line-height:1.2;color:#fff}
.home-story p{font-size:21px;line-height:1.45;color:#e4edf1;margin:4px 0 15px}
.home-lime-cta{background:var(--lime,#d3fb77);color:var(--navy);font-size:22px;min-width:195px;min-height:50px;border-radius:999px;gap:30px}
.home-lime-cta:hover{background:#e0ff9c}
.home-faq{padding-bottom:25px}
.home-faq>h2{font-size:34px;font-weight:800;margin:12px 10px 10px}
.home-faq-list{display:grid;gap:8px;padding:0 10px}
.home-faq details{border:1px solid #d9ddd8;border-radius:23px;background:#fffefa;overflow:hidden}
.home-faq summary{display:flex;align-items:center;justify-content:space-between;gap:18px;cursor:pointer;list-style:none;min-height:47px;padding:9px 24px;font-size:18px;font-weight:650;line-height:1.45}
.home-faq summary::-webkit-details-marker{display:none}
.home-faq summary svg{transition:transform .18s}
.home-faq details[open] summary svg{transform:rotate(180deg)}
.home-faq details[open] summary{color:var(--teal)}
.home-faq details p{font-size:17px;line-height:1.75;color:#405366;padding:0 24px 17px;max-width:960px}
.home-purpose-link{font-size:15px;color:#526575;margin:20px 12px 0;display:flex;align-items:center;flex-wrap:wrap;gap:5px 12px}
.home-purpose-link a{color:var(--teal);font-weight:650;display:inline-flex;align-items:center;gap:6px;text-decoration:underline;text-underline-offset:4px}
@media(min-width:1500px){.hero-inner{min-height:600px}.home-title{font-size:80px}.home-hero-art{max-height:600px}}
@media(max-width:1100px){.hero-inner{min-height:500px}.home-title{font-size:clamp(43px,5.9vw,65px)}.home-eyebrow{font-size:19px}.home-intro{font-size:26px}.home-hero-art{margin-inline:-5px -10px}.home-main-cta{min-width:310px;font-size:23px;min-height:63px}.home-cta-note{max-width:310px}.home-area h2{font-size:23px}.home-story h2{font-size:39px}.home-story-copy{width:73%}.home-story p{font-size:20px}.home-process>h2{font-size:41px}}
@media(max-width:760px){.home-hero{padding-top:9px}.hero-inner{grid-template-columns:1fr;gap:0;min-height:0}.home-hero-copy{text-align:center;padding:26px 0 0}.home-eyebrow{font-size:17px;margin-bottom:12px}.home-title{font-size:clamp(42px,8.8vw,62px);white-space:normal;line-height:1.08}.home-intro{font-size:22px;margin:17px 0 21px}.home-main-cta{width:min(340px,100%);min-width:0;font-size:21px;min-height:58px;gap:26px}.home-cta-note{max-width:none;margin-top:8px;font-size:14px}.home-hero-art{width:min(380px,90%);margin:-3px auto -5px;aspect-ratio:1.05}.home-hero-art img{width:100%}.home-areas{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px;border-radius:24px}.home-area{min-height:130px;border-radius:18px;gap:9px;padding:13px 6px}.home-area-icon{width:61px;height:61px}.home-area-icon svg{width:30px;height:30px}.home-area h2{font-size:21px}.home-process{padding-block:31px 30px}.home-process>h2{font-size:31px;max-width:340px;margin-inline:auto}.home-heading-accent{margin-block:14px 22px;width:48px;height:5px}.home-steps{grid-template-columns:1fr;gap:22px;text-align:right;max-width:350px;margin-inline:auto}.home-step{padding:0;display:grid;grid-template-columns:144px 1fr;column-gap:10px;align-items:center}.home-step-top{grid-row:span 2;gap:14px;justify-content:flex-start}.home-step-icon{width:66px;height:66px}.home-step-icon svg{width:31px}.home-step-number{font-size:40px}.home-step h3{font-size:24px;align-self:end;margin:0 0 3px}.home-step p{font-size:18px;line-height:1.35;align-self:start}.home-step-arrow{display:none}.home-story{min-height:350px;border-radius:26px;margin-bottom:24px;align-items:flex-end}.home-story>img{object-position:70% center;opacity:.8}.home-story:after{background:linear-gradient(0deg,#032c43 3%,#032c43ed 40%,#032c4370 72%,transparent)}.home-story-copy{width:100%;padding:110px 25px 26px}.home-story h2{font-size:33px}.home-story p{font-size:19px;max-width:350px;margin:8px 0 18px}.home-lime-cta{font-size:20px;min-height:48px;min-width:180px}.home-faq>h2{font-size:29px;margin:0 2px 12px}.home-faq-list{padding:0;gap:9px}.home-faq summary{font-size:16px;padding:12px 16px;min-height:49px}.home-faq details{border-radius:21px}.home-faq details p{padding:0 16px 16px;font-size:16px}.home-purpose-link{margin-inline:2px;font-size:14px;gap:6px}.home-faq{padding-bottom:28px}}
@media(prefers-reduced-motion:reduce){.home-area,.home-faq summary svg{transition:none}.home-area:hover{transform:none}}
</style>
