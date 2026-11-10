export interface Binding {id:string;realRoot:string;instanceId:string;name:string;mission:string;direction:string;version:string;policy:string;issue?:string}
export interface Workspace {id:string;path:string;name:string}
export interface Accumulation {id:string;title:string;summary:string;kind:string;scope:string[];state:string}
export interface AssetDetail extends Accumulation {source:string;conditions:string[];excludes:string[];body:string;hash:string;partial:boolean;available:boolean;message:string}
export interface EntryView {workspace:Workspace|null;binding:Binding|null;bindings:Binding[];assets:Accumulation[];tasks:TaskSummary[];issue:string}
export interface DraftInput {kind:'sop'|'memory'|'experience'|'capability';subtype?:'general'|'habit';title:string;summary:string;triggers:string[];aliases?:string[];scope:string[];conditions?:string[];excludes?:string[];steps:string[];failure_handling?:string[];completion_checks?:string[];notes?:string[]}
export interface Candidate {id:string;title:string;summary:string;kind:string;scope:string[];reason:string;state:string}
export interface Selection {assetId:string;title:string;body:string;hash:string;source:string;sourceHash:string;overrides:string;selectedAt:string}
export interface Delivery {operationId:string;requestId:string;assetId:string;hash:string;overrides:string;state:string;userSeq:number|null;createdAt:string}
export interface Artifact {id:string;seq:number;sourceSessionId:string;deliveryId:string;title:string;text:string;hash:string;createdAt:string}
export interface Preview {id:string;revision:number;body:string;hash:string;assetId:string;target:string;decision:string;summary:string;priorBody:string;priorAssetId:string}
export interface Receipt {operationId:string;transactionId:string;state:string;decision:string;target:string;readback:boolean;recall:boolean;recallQuery?:string;projection:string;raw:string}
export interface Learning {id:string;sourceId:string;sourceSeq:number;sourceQuote:string;request:DraftInput;revision:number;preview:Preview|null;receipt:Receipt|null}
export interface TaskView {id:string;bindingId:string;sessionId:string;workspaceId:string;title:string;query:string;candidates:Candidate[];queryDecision?:string;selection:Selection|null;deliveries:Delivery[];artifacts:Artifact[];learning:Learning[];suggestions?:{operationId:string;sourceId:string;state:string}[]}
export interface TaskSummary {id:string;title:string;bindingId:string;sessionId:string;workspaceId:string;artifactCount:number;pendingLearning:number}
export interface View {revision:number;bindings:Binding[];task:TaskView|null;tasks:TaskSummary[];issue?:string}
export interface SessionOption {id:string;title:string;workspaceId:string;workspaceName:string;running:boolean}
