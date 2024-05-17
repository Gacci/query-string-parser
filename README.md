# Query String Parser
### Overview

The Parser class is a robust utility designed to convert query strings into structured objects of type FilterQuery. This functionality is critical in applications where data retrieval or manipulation is contingent upon dynamic user inputs. This class streamlines the parsing process, offering a standardized method to interpret complex query strings into actionable database queries or data processing commands.


### Query Structure
Queries are structured in the following format:


```sh
filter=type:field:operator:value
```

### Type
Specifies the data type of the field being queried. Supported types include:

```sh
   - s (String): Textual data.
   - b (Boolean): Boolean values (true or false).
   - n (Number): Numeric data.
   - d (Date): Date values.
   - v (Void): Represents null or undefined values.
```


### Field
Indicates the name of the data field targeted by the query, typically corresponding to database column names or keys in JSON objects.


### Operator
Operators define how the field's value is evaluated, with available options varying based on the data type:

```sh
  -  =: Equal to
  -  !=: Not equal to
  -  >: Greater than
  -  >=: Greater than or equal to
  -  <: Less than
  -  <=: Less than or equal to
  -  ><: Inclusive range
  -  >!<: Exclusive range
  -  <>: Exists
  -  <!>: Does not exist
  -  !!: Boolean NOT
  -  !: Negation
```


### Value

The value must conform to restrictions imposed by the field's type and the chosen operator. For example:
```sh
    Booleans (b): Only = and != with true or false.
        b:verified:=:true: Verifies if the field is true.
        b:verified:=:false: Verifies if the field is false.
        b:verified:!=:true: Verifies if the field is not true.
        b:verified:!=:false: Verifies if the field is not false.
```

For types such as date (d) and number (n), operators like =, !=, >, >=, <, <=, and range operators (><, >!<) are applicable. Range operators should specify a lower and higher boundary:


```sh
filter=type:field:operator:[lower,higher]
```

This defines a range with boundaries lower and higher, where the inclusivity or exclusivity is determined by the operator.
