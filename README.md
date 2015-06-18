# element-size-watch
A method for applying CSS classes and invoking a callback function by querying the size of HTML elements

## usage
```javascript
document.querySelector(selector).sizeWatch(options);
```
###### **_options_** parameter contents:
**_querySpec_** (OPTIONAL):
> A string specifying the tests to check for each time the element is resized. The format of the _querySpec_ is:

>**[{min-, max-}]{width, height}:[0-9]+{px, %}[:className], ...**

> and can be given as the content of an attribute of the element with name **data-size-watch**.

**_callback_** (OPTIONAL):
> A function to call whenever the size of the watched element is found to match one of the tests in the _querySpec_. If the _querySpec_ is not provided and the _callback_ is a string, it is used as the _querySpec_.

**useAnimationFrame** (OPTIONAL, true by default):
> A boolean value indicating whether to make the relevant changes in an **_window.requestAnimationFrame_** callback or directly.

###### workflow:

When the element is resized, each of the tests in the _querySpec_ is checked and if it succeeds, a descriptive class name of the form, e.g., _min-width-Npx_ is added to the class attribute of the element and the callback, if it has been provided is executed with an object parameter of the form:
```
{
    element: the_element,
    elementSize: {
        width: the_width_of_the_element,
        height: the_height_of_the_element
    },
    classesRemoved: [ an_array_with_the_classes_removed ],
    classesAdded: [ an_array_with_the_classes_added ]
}
```
If the test does not succeed any class that had previously been added is removed from the class attribute of the element. If no such additions or deletions occur, the callback is not called. Finally, if _className_ had been given for a test, then this is the class name used in the class attribute of the element as well as the _classesRemoved_ and _classesAdded_ arrays of the object passed to the callback.
