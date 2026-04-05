import { createRouter, createWebHistory } from 'vue-router'
import ContentOutlinePage from '../components/ContentOutlinePage.vue'
import UmlCanvas from '../components/UmlCanvas.vue'
import ErDiagram from '../components/ErDiagram.vue'
import UseCaseDiagram from '../components/UseCaseDiagram.vue'
import SequenceDiagramPage from '../components/SequenceDiagramPage.vue'
import ArchitectureDiagramPage from '../components/ArchitectureDiagramPage.vue'
import FlowDiagramPage from '../components/FlowDiagramPage.vue'
import FunctionStructurePage from '../components/FunctionStructurePage.vue'
import DeploymentDiagramPage from '../components/DeploymentDiagramPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/HelloWorld.vue')
  },
  {
    path: '/content-outline',
    name: 'ContentOutline',
    component: ContentOutlinePage
  },
  {
    path: '/uml',
    name: 'UML',
    component: UmlCanvas
  },
  {
    path: '/er',
    name: 'ER',
    component: ErDiagram
  },
  {
    path: '/usecase',
    name: 'UseCase',
    component: UseCaseDiagram
  },
  {
    path: '/sequence',
    name: 'Sequence',
    component: SequenceDiagramPage
  },
  {
    path: '/architecture',
    name: 'Architecture',
    component: ArchitectureDiagramPage
  },
  {
    path: '/flow',
    name: 'Flow',
    component: FlowDiagramPage
  },
  {
    path: '/function-structure',
    name: 'FunctionStructure',
    component: FunctionStructurePage
  },
  {
    path: '/deployment',
    name: 'Deployment',
    component: DeploymentDiagramPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router