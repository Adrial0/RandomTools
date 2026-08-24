const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={
  console,Date,Math,Object,Array,String,Number,Set,
  document:{getElementById(){return null}},
  grantGuildReputation(amount){context.s.rep+=amount},
  log(){},notify(){},
  save(){context.saveCount++},
  updateNavigationLocks(){context.navigationUpdates++},
  renderOnboardingGoals(){context.goalRenders++}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../js/progression.js'),'utf8'),context);
context.renderOnboardingGoals=()=>{context.goalRenders++};

context.saveCount=0;context.navigationUpdates=0;context.goalRenders=0;
context.s={gold:0,rep:0,members:[],missions:[],wins:0,inventory:[],materials:{},harvestJobs:[],up:{},discoveredResources:[],onboarding:{collapsed:false,flags:{itemEquipped:true},claimed:[]}};
context.setOnboardingFlag('itemEquipped');
assert.ok(context.s.onboarding.claimed.includes('equipItem'),'an already-set equipment flag still reconciles its goal');
assert.equal(context.goalRenders,1,'equipment changes redraw goals immediately');
assert.equal(context.navigationUpdates,1,'equipment changes refresh feature visibility immediately');
assert.equal(context.saveCount,1,'reactive goal state is persisted');

const appSource=fs.readFileSync(require.resolve('../js/app.js'),'utf8');
assert.match(appSource,/finally\{requestAnimationFrame\(animateTimerBars\)\}/,'animation loop reschedules even after updater errors');
assert.match(appSource,/setInterval\(\(\)=>\{if\(!document\.hidden\)updateFluidTimerBars\(Date\.now\(\)\)\},50\)/,'foreground timer fallback runs every 50ms');

console.log('Onboarding and timer resilience tests passed.');
