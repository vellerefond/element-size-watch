###### 7.3.1 - Fixed a logic bug regarding the min-max query specification

###### 7.3.0 - Added the min-max-{width,height} query specification

###### 7.2.0 - Removed setTimeout logic

###### 7.1.0 - Fixes in the initialization logic for when the iframe's contentWindow is not immediately available after the appendChild call

###### 7.0.0 - Added the "cleared" modifier to clear a specific class if the rule is matched and removed the necessity of the "px" specification for pixels

###### 6.1.0 - Made various optimizations, exposed elementSizeWatchInspect to allow manual updates and implemented the option useDeferredEventBinding and the function elementSizeWatchOnResizeEventBind to allow deferred onresize binding

###### 6.0.0 - Changed from window's load event to immediate call

###### 5.0.0 - Changed from HTMLElement.prototype.sizeWath to window.elementSizeWatch

###### 4.0.0 - Made various performance improvements

###### 3.0.0 - Added the ability to suppress class additions if an alias has not been provided, or on demand, and to pass * as the querySpec to only fire the resize event

###### 2.0.2 - Fixed logic bugs relating to passing the querySpec around during initialization

###### 2.0.1 - Fixed an initialization bug related to explicitly passing the querySpec property in the initialization object parameter

###### 2.0.0 - Extended the query specification support to allow for multiple query specifications of the same type but with different query values

###### 1.0.0 - Basic support for "[{min-, max-}]{width, height}:[0-9]+{px, %}[:className], ..." query specifications
